import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductosAdminClient from "./ProductosAdminClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) redirect("/admin/login");
  const { data: { user }, error: authError } = await adminClient().auth.getUser(token);
  if (authError || !user) redirect("/admin/login");

  const supabase = adminClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("display_order");

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface-soft px-4">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          Error cargando productos: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface-soft">
      {/* Header */}
      <header className="border-b border-border-soft bg-surface-card/95 px-6 py-4 shadow-[0_14px_40px_-32px_rgba(47,111,54,0.35)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Catálogo interno</p>
          <h1 className="text-xl font-bold tracking-tight text-text-main">Mas Cerca AP — Admin</h1>
          <p className="mt-0.5 text-xs text-text-muted">{products?.length ?? 0} productos en total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos/nuevo"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.85)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
          >
            + Nuevo producto
          </Link>
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
            >
              Salir
            </button>
          </form>
        </div>
        </div>
      </header>

      <ProductosAdminClient initialProducts={products ?? []} />
    </div>
  );
}
