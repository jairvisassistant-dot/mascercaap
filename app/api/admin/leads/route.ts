import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { leadUpdateSchema } from "@/lib/schemas/admin";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  const { data: { user }, error } = await adminClient().auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const fuente = url.searchParams.get("fuente");
  const estado = url.searchParams.get("estado");

  let query = adminClient()
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);
  if (fuente) query = query.eq("fuente", fuente);
  if (estado) query = query.eq("estado_seguimiento", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "id y al menos un campo a actualizar son requeridos" }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const { error } = await adminClient()
    .from("leads")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
