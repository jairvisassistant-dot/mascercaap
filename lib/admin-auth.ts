import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const COOKIE_NAME = "admin_session";

/**
 * Valida la sesión de admin desde la cookie JWT.
 * Retorna un NextResponse 401 si falla, o null si está autorizado.
 * Uso: const authError = await requireAdminAuth(req); if (authError) return authError;
 */
export async function requireAdminAuth(req: Request): Promise<NextResponse | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];

  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || data.user?.email !== adminEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return null;
}
