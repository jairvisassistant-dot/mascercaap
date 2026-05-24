import { NextResponse } from "next/server";
import { supabase } from "@/lib/admin/supabase-service";

const COOKIE_NAME = "admin_session";

/**
 * Validates the admin session from the JWT cookie.
 * Returns a NextResponse 401 if validation fails, or null if authorized.
 * Usage: const authError = await requireAdminAuth(req); if (authError) return authError;
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
