import { NextRequest, NextResponse } from "next/server";
import { getAdminClientFromCookie } from "@/lib/admin-supabase";
import { mfaVerifyEnrollmentSchema } from "@/lib/schemas/admin";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const { supabase, error } = await getAdminClientFromCookie(cookieHeader);

  if (!supabase || error) {
    return NextResponse.json({ error: error ?? "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = mfaVerifyEnrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { factor_id, code } = parsed.data;

  // 1. Challenge
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor_id,
  });

  if (challengeError) {
    return NextResponse.json(
      { error: "Error al generar el desafío: " + challengeError.message },
      { status: 500 }
    );
  }

  // 2. Verificar el código
  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor_id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Código incorrecto. Intenta de nuevo." },
      { status: 401 }
    );
  }

  // El factor ya está verificado. Si verify devolvió un nuevo access_token
  // con AAL2, actualizamos la cookie para que el usuario tenga la sesión
  // elevada inmediatamente.
  const aal2Token = verifyData?.access_token;
  const res = NextResponse.json({ ok: true, verified: true });

  if (aal2Token) {
    res.cookies.set("admin_session", aal2Token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  return res;
}
