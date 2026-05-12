import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  reorderSchema,
  keyOnlySchema,
} from "@/lib/schemas/admin";

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

function revalidateProductos() {
  revalidatePath("/[lang]/productos", "page");
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await adminClient()
    .from("product_categories")
    .select("*")
    .eq("active", true)
    .order("display_order");

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

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "key y direction son requeridos" }, { status: 400 });
  }

  const { key, direction } = parsed.data;
  const sb = adminClient();
  const { data: cats } = await sb
    .from("product_categories")
    .select("key, display_order")
    .eq("active", true)
    .order("display_order");

  if (!cats) return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });

  const idx = cats.findIndex((c) => c.key === key);
  if (idx === -1) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= cats.length) {
    return NextResponse.json({ error: "No se puede mover en esa dirección" }, { status: 400 });
  }

  const [a, b] = [cats[idx], cats[swapIdx]];
  await Promise.all([
    sb.from("product_categories").update({ display_order: b.display_order }).eq("key", a.key),
    sb.from("product_categories").update({ display_order: a.display_order }).eq("key", b.key),
  ]);

  revalidateProductos();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "key y label son requeridos" }, { status: 400 });
  }

  const { key, label, description } = parsed.data;
  const { data, error } = await adminClient()
    .from("product_categories")
    .update({ label, description: description ?? "" })
    .eq("key", key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateProductos();
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = keyOnlySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "key es requerido" }, { status: 400 });
  }

  const { key } = parsed.data;
  const sb = adminClient();

  const { count } = await sb
    .from("product_lines")
    .select("key", { count: "exact", head: true })
    .eq("category_key", key)
    .eq("active", true);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Esta categoría tiene ${count} línea${count !== 1 ? "s" : ""} asociada${count !== 1 ? "s" : ""}. Reasigna o elimina las líneas antes de borrar la categoría.` },
      { status: 409 }
    );
  }

  const { error } = await sb
    .from("product_categories")
    .update({ active: false })
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateProductos();
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "key y label son requeridos" }, { status: 400 });
  }

  const { key, label, description } = parsed.data;
  const sb = adminClient();
  const { data: last } = await sb
    .from("product_categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = (last?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await sb
    .from("product_categories")
    .insert({ key, label, description: description ?? "", display_order: nextOrder, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateProductos();
  return NextResponse.json(data, { status: 201 });
}
