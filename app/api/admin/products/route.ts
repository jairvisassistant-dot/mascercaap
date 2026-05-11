import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const body = await req.json();

  if (!body.id || !body.name || !body.line || !body.presentation || !body.description) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const supabase = adminClient();

  // Verificar regla: máximo 3 featured
  if (body.featured) {
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("featured", true);
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Máximo 3 productos destacados. Quitá uno antes de agregar otro." },
        { status: 422 }
      );
    }
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      id: body.id,
      name: body.name,
      line: body.line,
      presentation: body.presentation,
      presentation_order: body.presentationOrder ?? 0,
      price: body.price ?? null,
      image: body.image ?? null,
      description: body.description,
      ingredients: body.ingredients ?? [],
      benefits: body.benefits ?? [],
      is_sold_out: body.isSoldOut ?? false,
      is_best_seller: body.isBestSeller ?? false,
      featured: body.featured ?? false,
      active: body.active ?? true,
      display_order: body.displayOrder ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `El ID "${body.id}" ya existe` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/[lang]/productos", "page");
  return NextResponse.json(data, { status: 201 });
}
