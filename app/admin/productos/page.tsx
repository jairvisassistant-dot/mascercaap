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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">Error cargando productos: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Mas Cerca AP — Admin</h1>
          <p className="text-gray-400 text-xs mt-0.5">{products?.length ?? 0} productos en total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/productos/nuevo"
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Nuevo producto
          </Link>
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <ProductosAdminClient initialProducts={products ?? []} />
    </div>
  );
}
