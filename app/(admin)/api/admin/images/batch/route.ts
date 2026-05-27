// ─────────────────────────────────────────────────────────────────────────
// POST /api/admin/images/batch — Subida masiva de imágenes
// Recibe múltiples archivos + mapping a productos en un solo request.
// Procesa cada item independientemente: errores por archivo no cancelan el lote.
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { supabase } from "@/lib/admin/supabase-service";
import { requireAdminAuth } from "@/lib/admin/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { extname } from "path";

const BUCKET = "product-images";
const MAX_BATCH_SIZE = 20;
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export type BatchEntry = {
  fileIndex: number;
  productId: string;
};

export type BatchResult = {
  fileIndex: number;
  productId: string;
  status: "done" | "error";
  url?: string;
  error?: string;
};

export async function POST(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  if (!supabase) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const formData = await req.formData();

  // Parse entries metadata
  const entriesRaw = formData.get("entries");
  if (!entriesRaw || typeof entriesRaw !== "string") {
    return NextResponse.json({ error: "Falta metadata 'entries'" }, { status: 400 });
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(entriesRaw);
  } catch {
    return NextResponse.json({ error: "entries debe ser un JSON válido" }, { status: 400 });
  }

  if (!Array.isArray(rawParsed) || rawParsed.length === 0) {
    return NextResponse.json({ error: "entries debe ser un array no vacío" }, { status: 400 });
  }

  if (rawParsed.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Máximo ${MAX_BATCH_SIZE} imágenes por lote` },
      { status: 400 },
    );
  }

  const entries: BatchEntry[] = [];
  const seenFileIndexes = new Set<number>();
  const seenProductIds = new Set<string>();
  let duplicateProduct: string | null = null;

  for (let i = 0; i < rawParsed.length; i++) {
    const item = rawParsed[i] as Record<string, unknown>;

    // Validate structure
    if (
      typeof item.fileIndex !== "number" ||
      !Number.isInteger(item.fileIndex) ||
      item.fileIndex < 0
    ) {
      return NextResponse.json(
        { error: `Entry ${i}: fileIndex inválido (debe ser entero >= 0)` },
        { status: 400 },
      );
    }

    if (typeof item.productId !== "string" || item.productId.trim().length === 0) {
      return NextResponse.json(
        { error: `Entry ${i}: productId inválido o vacío` },
        { status: 400 },
      );
    }

    // Detect duplicate fileIndex
    if (seenFileIndexes.has(item.fileIndex)) {
      return NextResponse.json(
        { error: `Entry ${i}: fileIndex ${item.fileIndex} duplicado` },
        { status: 400 },
      );
    }
    seenFileIndexes.add(item.fileIndex);

    // Detect duplicate productId
    if (seenProductIds.has(item.productId)) {
      duplicateProduct = item.productId;
      break;
    }
    seenProductIds.add(item.productId);

    entries.push({ fileIndex: item.fileIndex, productId: item.productId });
  }

  if (duplicateProduct) {
    return NextResponse.json(
      {
        error: `El producto "${duplicateProduct}" está asignado a más de un archivo en el mismo lote`,
      },
      { status: 400 },
    );
  }

  // Collect all product IDs to update in one query
  const productIds = [...seenProductIds];

  // Verify products exist
  const { data: existingProducts, error: productsError } = await supabase
    .from("products")
    .select("id, image")
    .in("id", productIds);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const existingMap = new Map(
    (existingProducts ?? []).map((p) => [p.id, p]),
  );

  // Capture non-null supabase reference so TypeScript keeps the narrowing
  // inside async arrow functions (closures lose outer narrowing).
  const db = supabase;

  // Cache the bucket reference outside the map so storage.from() is called
  // once regardless of how many entries are processed in parallel.
  const bucket = db.storage.from(BUCKET);

  const results: BatchResult[] = await Promise.all(
    entries.map(async (entry): Promise<BatchResult> => {
      const fileField = `file_${entry.fileIndex}`;
      const file = formData.get(fileField) as File | null;

      if (!file) {
        return {
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: `No se encontró el archivo (file_${entry.fileIndex})`,
        };
      }

      // Validate file type & size
      if (!ALLOWED_TYPES.has(file.type)) {
        return {
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: `Tipo no permitido: ${file.type}. Use .webp, .jpg o .png`,
        };
      }

      if (file.size > MAX_SIZE_BYTES) {
        return {
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: `Archivo excede 2MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        };
      }

      // Verify product exists
      if (!existingMap.has(entry.productId)) {
        return {
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: `Producto ${entry.productId} no encontrado`,
        };
      }

      // Upload file
      const ext = extname(file.name) || ".webp";
      const filename = `products/${randomUUID()}${ext}`;

      try {
        const bytes = await file.arrayBuffer();
        const { error: uploadError } = await bucket
          .upload(filename, Buffer.from(bytes), {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          return {
            fileIndex: entry.fileIndex,
            productId: entry.productId,
            status: "error",
            error: `Error de storage: ${uploadError.message}`,
          };
        }

        const {
          data: { publicUrl },
        } = bucket.getPublicUrl(filename);

        // Update product
        const { error: updateError } = await db
          .from("products")
          .update({ image: publicUrl })
          .eq("id", entry.productId);

        if (updateError) {
          return {
            fileIndex: entry.fileIndex,
            productId: entry.productId,
            status: "error",
            error: `Error actualizando producto: ${updateError.message}`,
          };
        }

        return {
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "done",
          url: publicUrl,
        };
      } catch (e) {
        return {
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: e instanceof Error ? e.message : "Error inesperado",
        };
      }
    }),
  );

  const successCount = results.filter((r) => r.status === "done").length;

  // Revalidate product pages if anything succeeded
  if (successCount > 0) {
    revalidatePath("/[lang]/productos", "page");
  }

  return NextResponse.json({ results });
}
