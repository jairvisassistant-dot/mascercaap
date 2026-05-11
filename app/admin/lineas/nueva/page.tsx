import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import NuevaLineaForm from "../NuevaLineaForm";

export const dynamic = "force-dynamic";

export default async function NuevaLineaPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) redirect("/admin/login");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) redirect("/admin/login");

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Catálogo interno
        </p>
        <h1 className="text-xl font-bold tracking-tight text-text-main">Nueva línea de producto</h1>
        <p className="mt-1 text-sm text-text-muted">
          Crea una nueva categoría. Luego podrás agregar productos a ella.
        </p>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <NuevaLineaForm />
      </div>
    </div>
  );
}
