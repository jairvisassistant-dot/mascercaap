import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function revalidateProductos() {
  revalidatePath("/[lang]/productos", "page");
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const supabase = adminClient();

  // Verificar regla: máximo 3 featured
  if (body.featured) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("featured", true)
      .neq("id", id);
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Máximo 3 productos destacados. Quitá uno antes de destacar este." },
        { status: 422 }
      );
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name: body.name,
      line: body.line,
      presentation: body.presentation,
      presentation_order: body.presentationOrder,
      price: body.price ?? null,
      image: body.image ?? null,
      description: body.description,
      ingredients: body.ingredients ?? [],
      benefits: body.benefits ?? [],
      is_sold_out: body.isSoldOut ?? false,
      is_best_seller: body.isBestSeller ?? false,
      featured: body.featured ?? false,
      active: body.active ?? true,
      display_order: body.displayOrder,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  revalidateProductos();
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const supabase = adminClient();

  // Verificar regla featured solo si se está activando
  if (body.featured === true) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("featured", true)
      .neq("id", id);
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Máximo 3 productos destacados" },
        { status: 422 }
      );
    }
  }

  const allowed = ["featured", "is_sold_out", "is_best_seller", "active"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin campos válidos para actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  revalidateProductos();
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const supabase = adminClient();

  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateProductos();
  return NextResponse.json({ ok: true });
}
