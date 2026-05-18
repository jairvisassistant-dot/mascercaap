import { NextRequest, NextResponse } from "next/server";
import { getAdminClientFromCookie } from "@/lib/admin-supabase";
import { mfaUnenrollSchema } from "@/lib/schemas/admin";

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

  const parsed = mfaUnenrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { factor_id } = parsed.data;

  const { error: unenrollError } = await supabase.auth.mfa.unenroll({
    factorId: factor_id,
  });

  if (unenrollError) {
    return NextResponse.json(
      { error: "Error al deshabilitar 2FA: " + unenrollError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, unenrolled: true });
}
