import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-session";
import CategoriasList from "./CategoriasList";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  await requireAdminSession();

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await sb
    .from("product_categories")
    .select("key, label, description, display_order")
    .eq("active", true)
    .order("display_order");

  const categories = (data ?? []) as {
    key: string;
    label: string;
    description: string;
    display_order: number;
  }[];

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Catálogo interno
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-main">Categorías</h1>
            <p className="mt-1 text-sm text-text-muted">
              Usá las flechas para cambiar el orden en que aparecen en la página de productos.
            </p>
          </div>
          <Link
            href="/admin/categorias/nueva"
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(63,143,70,0.8)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
          >
            + Nueva categoría
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <CategoriasList initial={categories} />
      </div>
    </div>
  );
}
