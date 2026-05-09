import { NextRequest, NextResponse } from "next/server";
import { leadSchema } from "@/lib/schemas/lead";
import { supabase } from "@/lib/supabase";

// Rate limiting — sliding window, in-memory
// 10 requests per IP per 60s. Resets on cold start — acceptable for a chatbot
// lead capture flow. Upgrade to @upstash/ratelimit + Vercel KV for cross-instance
// persistence if spam volume justifies the operational cost.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) return false;

  timestamps.push(now);
  requestLog.set(ip, timestamps);

  if (requestLog.size > 500) {
    for (const [key, times] of requestLog.entries()) {
      if (times.every((t) => t <= windowStart)) requestLog.delete(key);
    }
  }

  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
    }

    const { data } = parsed;

    const { error } = await supabase.from("leads").insert({
      nombre: data.nombre,
      email: data.email ?? null,
      tipo: data.tipo,
      producto_interes: data.producto_interes ?? null,
      preguntas_bot: data.preguntas_bot ?? [],
      fuente: "chatbot_web",
    });

    if (error) {
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
