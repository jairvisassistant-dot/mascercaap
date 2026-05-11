import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { productLines as staticProductLines } from "@/data/products";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = adminClient();
  const { data, error } = await sb
    .from("product_lines")
    .select("*")
    .order("display_order");

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      staticProductLines.map((l, i) => ({
        key: l.key,
        label: l.label,
        description: l.description,
        gradient: l.gradient,
        icon_emoji: l.iconEmoji,
        chip_image: l.chipImage ?? null,
        display_order: i,
        active: true,
      }))
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { key, label, description, gradient, iconEmoji } = body as {
    key: string;
    label: string;
    description?: string;
    gradient?: string;
    iconEmoji?: string;
  };

  if (!key || !label) {
    return NextResponse.json({ error: "key y label son requeridos" }, { status: 400 });
  }

  const sb = adminClient();

  const { data: last } = await sb
    .from("product_lines")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = (last?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await sb
    .from("product_lines")
    .insert({
      key,
      label,
      description: description ?? "",
      gradient: gradient ?? "from-lime-400 to-green-500",
      icon_emoji: iconEmoji ?? "🛍️",
      display_order: nextOrder,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
