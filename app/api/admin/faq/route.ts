import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAuth } from "@/lib/admin-auth";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── GET (sin cambios) ────────────────────────────────────────────

export async function GET(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const supabase = adminClient();
  const [{ data: categories, error: categoriesError }, { data: config, error: configError }] = await Promise.all([
    supabase
      .from("faq_categories")
      .select("id, label_es, label_en, icon, display_order, active, faq_questions(id, category_id, question_es, question_en, answer_es, answer_en, keywords, display_order, active)")
      .order("display_order"),
    supabase
      .from("faq_config")
      .select("id, fallback_es, fallback_en")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (categoriesError || configError) {
    return NextResponse.json({ error: categoriesError?.message ?? configError?.message ?? "Error cargando FAQ" }, { status: 500 });
  }

  return NextResponse.json({
    categories: categories ?? [],
    config: config ?? null,
  });
}

// ── POST: crear categoría o pregunta ────────────────────────────

export async function POST(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const supabase = adminClient();
  const body = await req.json();

  if (body._type === "category") {
    if (!body.id || !body.label_es || !body.label_en) {
      return NextResponse.json({ error: "Faltan campos requeridos (id, label_es, label_en)" }, { status: 400 });
    }

    const { data: maxOrder } = await supabase
      .from("faq_categories")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("faq_categories").insert({
      id: body.id,
      label_es: body.label_es,
      label_en: body.label_en,
      icon: body.icon ?? "❓",
      display_order: (maxOrder?.display_order ?? 0) + 1,
      active: true,
    });

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Ya existe una categoría con ese ID" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body._type === "question") {
    if (!body.category_id || !body.question_es || !body.question_en || !body.answer_es || !body.answer_en) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const { data: maxOrder } = await supabase
      .from("faq_questions")
      .select("display_order")
      .eq("category_id", body.category_id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const id = `faq-q-${Date.now()}`;
    const { error } = await supabase.from("faq_questions").insert({
      id,
      category_id: body.category_id,
      question_es: body.question_es,
      question_en: body.question_en,
      answer_es: body.answer_es,
      answer_en: body.answer_en,
      keywords: body.keywords ?? [],
      display_order: (maxOrder?.display_order ?? 0) + 1,
      active: true,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id, success: true });
  }

  return NextResponse.json({ error: 'Tipo no válido. Usá _type: "category" o "question"' }, { status: 400 });
}

// ── PATCH: reordenar ────────────────────────────────────────────

export async function PATCH(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const supabase = adminClient();
  const body = await req.json();

  if (body._type === "category") {
    if (!body.id || !body.direction) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const { data: current, error: curErr } = await supabase
      .from("faq_categories")
      .select("id, display_order")
      .eq("id", body.id)
      .single();
    if (curErr || !current) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    const dir = body.direction === "up" ? "lt" : "gt";
    const orderDir = body.direction === "up" ? "desc" : "asc";

    const { data: neighbor } = await supabase
      .from("faq_categories")
      .select("id, display_order")
      .filter("display_order", dir, current.display_order)
      .order("display_order", { ascending: orderDir === "asc" })
      .limit(1)
      .maybeSingle();
    if (!neighbor) return NextResponse.json({ error: "Ya está en el borde" }, { status: 400 });

    const { error: e1 } = await supabase
      .from("faq_categories")
      .update({ display_order: neighbor.display_order })
      .eq("id", current.id);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    const { error: e2 } = await supabase
      .from("faq_categories")
      .update({ display_order: current.display_order })
      .eq("id", neighbor.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    return NextResponse.json({ success: true });
  }

  if (body._type === "question") {
    if (!body.id || !body.direction) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const { data: current, error: curErr } = await supabase
      .from("faq_questions")
      .select("id, category_id, display_order")
      .eq("id", body.id)
      .single();
    if (curErr || !current) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });

    const dir = body.direction === "up" ? "lt" : "gt";
    const orderDir = body.direction === "up" ? "desc" : "asc";

    const { data: neighbor } = await supabase
      .from("faq_questions")
      .select("id, display_order")
      .eq("category_id", current.category_id)
      .filter("display_order", dir, current.display_order)
      .order("display_order", { ascending: orderDir === "asc" })
      .limit(1)
      .maybeSingle();
    if (!neighbor) return NextResponse.json({ error: "Ya está en el borde" }, { status: 400 });

    const { error: e1 } = await supabase
      .from("faq_questions")
      .update({ display_order: neighbor.display_order })
      .eq("id", current.id);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    const { error: e2 } = await supabase
      .from("faq_questions")
      .update({ display_order: current.display_order })
      .eq("id", neighbor.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Tipo no válido. Usá _type: "category" o "question"' }, { status: 400 });
}

// ── PUT: editar ─────────────────────────────────────────────────

export async function PUT(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const supabase = adminClient();
  const body = await req.json();

  if (body._type === "category") {
    if (!body.id) return NextResponse.json({ error: "Falta el ID" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.label_es !== undefined) updates.label_es = body.label_es;
    if (body.label_en !== undefined) updates.label_en = body.label_en;
    if (body.icon !== undefined) updates.icon = body.icon;

    const { error } = await supabase.from("faq_categories").update(updates).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body._type === "question") {
    if (!body.id) return NextResponse.json({ error: "Falta el ID" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.question_es !== undefined) updates.question_es = body.question_es;
    if (body.question_en !== undefined) updates.question_en = body.question_en;
    if (body.answer_es !== undefined) updates.answer_es = body.answer_es;
    if (body.answer_en !== undefined) updates.answer_en = body.answer_en;
    if (body.keywords !== undefined) updates.keywords = body.keywords;

    const { error } = await supabase.from("faq_questions").update(updates).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body._type === "config") {
    const updates: Record<string, unknown> = {};
    if (body.fallback_es !== undefined) updates.fallback_es = body.fallback_es;
    if (body.fallback_en !== undefined) updates.fallback_en = body.fallback_en;

    const { error } = await supabase.from("faq_config").update(updates).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Tipo no válido. Usá _type: "category", "question" o "config"' }, { status: 400 });
}

// ── DELETE: desactivar (soft delete) ────────────────────────────

export async function DELETE(req: Request) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const supabase = adminClient();
  const body = await req.json();

  if (body._type === "category") {
    if (!body.id) return NextResponse.json({ error: "Falta el ID" }, { status: 400 });

    const { error } = await supabase
      .from("faq_categories")
      .update({ active: false })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body._type === "question") {
    if (!body.id) return NextResponse.json({ error: "Falta el ID" }, { status: 400 });

    const { error } = await supabase
      .from("faq_questions")
      .update({ active: false })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Tipo no válido. Usá _type: "category" o "question"' }, { status: 400 });
}
