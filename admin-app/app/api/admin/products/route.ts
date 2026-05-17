import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { productCreateSchema } from "@/lib/schemas/admin";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = productCreateSchema.safeParse(body);
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
      .eq("featured", true);
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Máximo 3 productos destacados. Quita uno antes de agregar otro." },
        { status: 422 }
      );
    }
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      id: d.id,
      name: d.name,
      line: d.line,
      presentation: d.presentation,
      presentation_order: d.presentationOrder ?? 0,
      price: d.price ?? null,
      image: d.image ?? null,
      description: d.description,
      ingredients: d.ingredients ?? [],
      benefits: d.benefits ?? [],
      is_sold_out: d.isSoldOut ?? false,
      is_best_seller: d.isBestSeller ?? false,
      featured: d.featured ?? false,
      active: d.active ?? true,
      display_order: d.displayOrder ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `El ID "${d.id}" ya existe` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/[lang]/productos", "page");
  return NextResponse.json(data, { status: 201 });
}
