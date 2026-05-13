import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-session";
import FAQAdminClient from "./FAQAdminClient";
import type { FAQCategoryRow, FAQConfigRow } from "@/types";

export const dynamic = "force-dynamic";

export default async function FAQAdminPage() {
  await requireAdminSession();

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [{ data: categories, error: catErr }, { data: config, error: configErr }] = await Promise.all([
    sb
      .from("faq_categories")
      .select("id, label_es, label_en, icon, display_order, active, faq_questions(id, category_id, question_es, question_en, answer_es, answer_en, keywords, display_order, active)")
      .order("display_order"),
    sb
      .from("faq_config")
      .select("id, fallback_es, fallback_en")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (catErr || configErr) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-soft px-4">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          Error cargando FAQ: {catErr?.message ?? configErr?.message ?? "Error desconocido"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Administración
        </p>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-main">FAQ / Preguntas Frecuentes</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gestioná las preguntas y respuestas que aparecen en la sección FAQ del chatbot.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 pt-0 lg:px-8">
        <FAQAdminClient
          initialCategories={(categories ?? []) as FAQCategoryRow[]}
          initialConfig={(config as FAQConfigRow | null) ?? null}
        />
      </div>
    </div>
  );
}
