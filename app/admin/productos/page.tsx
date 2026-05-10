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
    <div className="min-h-[100dvh]">
      <ProductosAdminClient initialProducts={products ?? []} />
    </div>
  );
}
