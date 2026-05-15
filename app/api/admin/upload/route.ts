// Prerequisito: crear bucket "product-images" en Supabase Storage con acceso público.
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { extname } from "path";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";

const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const BUCKET = "product-images";

const uploadMetaSchema = z.object({
  type: z.enum(ALLOWED_TYPES),
  size: z.number().int().positive().max(MAX_SIZE_BYTES),
  name: z.string().min(1).max(255),
});

// Rate limiting — 10 uploads per IP per 5 minutes (admin-only endpoint)
const uploadLog = new Map<string, number[]>();
const UPLOAD_RATE_MAX = 10;
const UPLOAD_RATE_WINDOW_MS = 5 * 60_000;

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - UPLOAD_RATE_WINDOW_MS;
  const timestamps = (uploadLog.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= UPLOAD_RATE_MAX) return false;

  timestamps.push(now);
  uploadLog.set(ip, timestamps);

  if (uploadLog.size > 200) {
    for (const [key, times] of uploadLog.entries()) {
      if (times.every((t) => t <= windowStart)) uploadLog.delete(key);
    }
  }

  return true;
}

export async function POST(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  if (!supabase) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  if (!checkUploadRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Intenta de nuevo en 5 minutos." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const validation = uploadMetaSchema.safeParse({
    type: file.type,
    size: file.size,
    name: file.name,
  });

  if (!validation.success) {
    const field = String(validation.error.issues[0].path[0] ?? "");
    const fieldMsg: Record<string, string> = {
      type: "Tipo de archivo no permitido. Use .webp, .jpg o .png",
      size: "El archivo supera el límite de 2MB",
    };
    return NextResponse.json(
      { error: fieldMsg[field] ?? validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const ext = extname(file.name) || ".webp";
  const filename = `products/${randomUUID()}${ext}`;

  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, Buffer.from(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
