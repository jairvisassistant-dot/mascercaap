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

  const results: BatchResult[] = [];

  for (const entry of entries) {
    const fileField = `file_${entry.fileIndex}`;
    const file = formData.get(fileField) as File | null;

    if (!file) {
      results.push({
        fileIndex: entry.fileIndex,
        productId: entry.productId,
        status: "error",
        error: `No se encontró el archivo (file_${entry.fileIndex})`,
      });
      continue;
    }

    // Validate file type & size
    if (!ALLOWED_TYPES.has(file.type)) {
      results.push({
        fileIndex: entry.fileIndex,
        productId: entry.productId,
        status: "error",
        error: `Tipo no permitido: ${file.type}. Use .webp, .jpg o .png`,
      });
      continue;
    }

    if (file.size > MAX_SIZE_BYTES) {
      results.push({
        fileIndex: entry.fileIndex,
        productId: entry.productId,
        status: "error",
        error: `Archivo excede 2MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
      continue;
    }

    // Verify product exists
    if (!existingMap.has(entry.productId)) {
      results.push({
        fileIndex: entry.fileIndex,
        productId: entry.productId,
        status: "error",
        error: `Producto ${entry.productId} no encontrado`,
      });
      continue;
    }

    // Upload file
    const ext = extname(file.name) || ".webp";
    const filename = `products/${randomUUID()}${ext}`;

    try {
      const bytes = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filename, Buffer.from(bytes), {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        results.push({
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: `Error de storage: ${uploadError.message}`,
        });
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(filename);

      // Update product
      const { error: updateError } = await supabase
        .from("products")
        .update({ image: publicUrl })
        .eq("id", entry.productId);

      if (updateError) {
        results.push({
          fileIndex: entry.fileIndex,
          productId: entry.productId,
          status: "error",
          error: `Error actualizando producto: ${updateError.message}`,
        });
        continue;
      }

      results.push({
        fileIndex: entry.fileIndex,
        productId: entry.productId,
        status: "done",
        url: publicUrl,
      });
    } catch (e) {
      results.push({
        fileIndex: entry.fileIndex,
        productId: entry.productId,
        status: "error",
        error: e instanceof Error ? e.message : "Error inesperado",
      });
    }
  }

  const successCount = results.filter((r) => r.status === "done").length;

  // Revalidate product pages if anything succeeded
  if (successCount > 0) {
    revalidatePath("/[lang]/productos", "page");
  }

  return NextResponse.json({ results });
}
