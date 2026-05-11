import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import ProductosAdminClient from "./ProductosAdminClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  await requireAdminSession();

  const supabase = adminClient();
  const [
    { data: products, error },
    { data: linesData },
    { data: categoriesData },
  ] = await Promise.all([
    supabase.from("products").select("*").order("display_order"),
    supabase.from("product_lines").select("key, label, category_key").order("display_order"),
    supabase.from("product_categories").select("key, label").eq("active", true).order("display_order"),
  ]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-soft px-4">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          Error cargando productos: {error.message}
        </p>
      </div>
    );
  }

  const lineLabels: Record<string, string> = {};
  const lineCategories: Record<string, string> = {};
  for (const l of linesData ?? []) {
    lineLabels[l.key] = l.label;
    if (l.category_key) lineCategories[l.key] = l.category_key;
  }

  const categories = (categoriesData ?? []).map((c) => ({ key: c.key, label: c.label }));

  return (
    <div className="min-h-[100dvh]">
      <ProductosAdminClient
        initialProducts={products ?? []}
        lineLabels={lineLabels}
        lineCategories={lineCategories}
        categories={categories}
      />
    </div>
  );
}
