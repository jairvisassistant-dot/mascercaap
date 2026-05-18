import { NextRequest, NextResponse } from "next/server";
import { getAdminClientFromCookie } from "@/lib/admin-supabase";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const { supabase, error } = await getAdminClientFromCookie(cookieHeader);

  if (!supabase || error) {
    return NextResponse.json({ error: error ?? "No autorizado" }, { status: 401 });
  }

  const { data, error: factorsError } = await supabase.auth.mfa.listFactors();

  if (factorsError) {
    return NextResponse.json(
      { error: "Error al obtener factores: " + factorsError.message },
      { status: 500 }
    );
  }

  const totpFactors = data?.totp ?? [];
  const verifiedFactors = totpFactors.filter(
    (f: { status: string }) => f.status === "verified"
  );

  return NextResponse.json({
    mfa_enabled: verifiedFactors.length > 0,
    factors: verifiedFactors.map(
      (f: { id: string; friendly_name: string | null; created_at: string }) => ({
        id: f.id,
        friendly_name: f.friendly_name,
        created_at: f.created_at,
      })
    ),
    unverified_factors: totpFactors
      .filter((f: { status: string }) => f.status !== "verified")
      .map((f: { id: string; status: string }) => ({ id: f.id, status: f.status })),
  });
}
