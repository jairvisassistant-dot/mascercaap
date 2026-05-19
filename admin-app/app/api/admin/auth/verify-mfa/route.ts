import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMfaSchema } from "@/lib/schemas/admin";
import {
  getMfaSession,
  deleteMfaSession,
} from "@/lib/mfa-store";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
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
      { error: "La sesión expiró. Iniciá sesión de nuevo." },
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
      { error: "Sesión inválida. Iniciá sesión de nuevo." },
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
      { error: "Código incorrecto. Intentá de nuevo." },
      { status: 401 }
    );
  }

  // 4. El verify devuelve un nuevo access_token con AAL2
  const aal2Token = verifyData?.access_token ?? stored.access_token;

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
