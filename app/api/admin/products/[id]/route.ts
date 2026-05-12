import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { productUpdateSchema, productPatchSchema } from "@/lib/schemas/admin";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = adminClient();

  if (d.featured) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("featured", true)
      .neq("id", id);
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Máximo 3 productos destacados. Quita uno antes de destacar este." },
        { status: 422 }
      );
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name: d.name,
      line: d.line,
      presentation: d.presentation,
      presentation_order: d.presentationOrder,
      price: d.price ?? null,
      image: d.image ?? null,
      description: d.description,
      ingredients: d.ingredients ?? [],
      benefits: d.benefits ?? [],
      is_sold_out: d.isSoldOut ?? false,
      is_best_seller: d.isBestSeller ?? false,
      featured: d.featured ?? false,
      active: d.active ?? true,
      display_order: d.displayOrder,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const supabase = adminClient();

  if (parsed.data.featured === true) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("featured", true)
      .neq("id", id);
    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "Máximo 3 productos destacados" }, { status: 422 });
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update(parsed.data)
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
