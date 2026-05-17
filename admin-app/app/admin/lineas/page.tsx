import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-session";
import LineasList from "./LineasList";

export const dynamic = "force-dynamic";

export default async function LineasPage() {
  await requireAdminSession();

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [{ data: linesData }, { data: catsData }] = await Promise.all([
    sb.from("product_lines").select("key, label, icon_emoji, description, category_key, display_order").eq("active", true).order("display_order"),
    sb.from("product_categories").select("key, label").eq("active", true).order("display_order"),
  ]);

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Catálogo interno
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-main">Líneas de producto</h1>
            <p className="mt-1 text-sm text-text-muted">
              Usa las flechas para cambiar el orden en que aparecen en la página de productos.
            </p>
          </div>
          <Link
            href="/admin/lineas/nueva"
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(63,143,70,0.8)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
          >
            + Nueva línea
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <LineasList
          initial={(linesData ?? []) as { key: string; label: string; icon_emoji: string; description: string; category_key: string | null; display_order: number }[]}
          categories={(catsData ?? []) as { key: string; label: string }[]}
        />
      </div>
    </div>
  );
}
