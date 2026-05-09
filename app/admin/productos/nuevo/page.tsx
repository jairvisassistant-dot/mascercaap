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
    <div className="min-h-[100dvh] bg-surface-soft">
      <header className="border-b border-border-soft bg-surface-card/95 px-6 py-4 shadow-[0_14px_40px_-32px_rgba(47,111,54,0.35)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1680px] items-center gap-4">
        <Link href="/admin/productos" className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main">
          ← Volver
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Catálogo interno</p>
          <h1 className="text-xl font-bold tracking-tight text-text-main">Nuevo producto</h1>
        </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <ProductoForm mode="create" />
      </div>
    </div>
  );
}
