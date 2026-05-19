import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMfaSchema } from "@/lib/schemas/admin";
import {
  getMfaSession,
  deleteMfaSession,
} from "@/lib/mfa-store";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// Sliding window: 5 attempts / 60s / IP
const mfaAttempts = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (mfaAttempts.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  mfaAttempts.set(ip, timestamps);
  if (mfaAttempts.size > 200) {
    for (const [key, times] of mfaAttempts.entries()) {
      if (times.every((t) => t <= windowStart)) mfaAttempts.delete(key);
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
      { error: "Demasiados intentos. Espera un minuto e intenta de nuevo." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = verifyMfaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { mfa_token, factor_id, code } = parsed.data;

  // 1. Recuperar sesión temporal del store
  const stored = getMfaSession(mfa_token);
  if (!stored) {
    return NextResponse.json(
      { error: "La sesión expiró. Inicia sesión de nuevo." },
      { status: 410 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  }

  // 2. Restaurar sesión de Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  });

  if (setSessionError) {
    deleteMfaSession(mfa_token);
    return NextResponse.json(
      { error: "Sesión inválida. Inicia sesión de nuevo." },
      { status: 401 }
    );
  }

  // 3. Challenge + Verify del factor TOTP
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor_id,
  });

  if (challengeError) {
    deleteMfaSession(mfa_token);
    return NextResponse.json(
      { error: "Error al generar el desafío 2FA." },
      { status: 500 }
    );
  }

  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor_id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    // No limpiar la sesión — el usuario puede reintentar
    return NextResponse.json(
      { error: "Código incorrecto. Intenta de nuevo." },
      { status: 401 }
    );
  }

  // 4. El verify debe devolver un access_token con AAL2 — si no, es un error
  const aal2Token = verifyData?.access_token;
  if (!aal2Token) {
    deleteMfaSession(mfa_token);
    return NextResponse.json(
      { error: "Error al verificar 2FA. Inicia sesión de nuevo." },
      { status: 500 }
    );
  }

  // 5. Setear cookie con el token AAL2
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, aal2Token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  // 6. Limpiar sesión temporal
  deleteMfaSession(mfa_token);

  return res;
}
