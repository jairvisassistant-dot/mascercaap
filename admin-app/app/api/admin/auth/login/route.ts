import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loginSchema } from "@/lib/schemas/admin";
import {
  createMfaToken,
  setMfaSession,
} from "@/lib/mfa-store";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// Sliding window: 3 attempts / 60s / IP
const loginAttempts = new Map<string, number[]>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (loginAttempts.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  loginAttempts.set(ip, timestamps);
  if (loginAttempts.size > 200) {
    for (const [key, times] of loginAttempts.entries()) {
      if (times.every((t) => t <= windowStart)) loginAttempts.delete(key);
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || data.user?.email !== adminEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // ── Verificar si el usuario tiene MFA habilitado ──────────────────────
  const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors();

  if (!mfaError && factors?.totp?.some((f: { status: string }) => f.status === "verified")) {
    // Tiene MFA -> guardar sesion temporal y pedir segundo factor
    const mfaToken = createMfaToken();
    setMfaSession(mfaToken, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    return NextResponse.json({
      needs_mfa: true,
      mfa_token: mfaToken,
      factor_ids: factors.totp
        .filter((f: { status: string }) => f.status === "verified")
        .map((f: { id: string }) => f.id),
    });
  }

  // ── Sin MFA -> login directo ──────────────────────────────────────────
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return res;
}
