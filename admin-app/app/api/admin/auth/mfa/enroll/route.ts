import { NextRequest, NextResponse } from "next/server";
import { getAdminClientFromCookie } from "@/lib/admin-supabase";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const { supabase, error } = await getAdminClientFromCookie(cookieHeader);

  if (!supabase || error) {
    return NextResponse.json({ error: error ?? "No autorizado" }, { status: 401 });
  }

  // Iniciar enrollment de un factor TOTP
  const { data, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Google Authenticator",
  });

  if (enrollError) {
    return NextResponse.json(
      { error: "Error al generar el código QR: " + enrollError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    factor_id: data.id,
    qr_code: data.totp.qr_code,      // SVG del QR
    secret: data.totp.uri,            // URI para ingreso manual
  });
}
