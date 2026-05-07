import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import ProductoForm from "../ProductoForm";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) redirect("/admin/login");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) redirect("/admin/login");

  return (
    <div className="min-h-screen">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/admin/productos" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← Volver
        </Link>
        <h1 className="text-lg font-bold text-white">Nuevo producto</h1>
      </header>
      <div className="p-6">
        <ProductoForm mode="create" />
      </div>
    </div>
  );
}
