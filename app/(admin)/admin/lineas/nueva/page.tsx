import { requireAdminSession } from "@/lib/admin/session";
import NuevaLineaForm from "../NuevaLineaForm";

export const dynamic = "force-dynamic";

export default async function NuevaLineaPage() {
  await requireAdminSession();

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Catálogo interno
        </p>
        <h1 className="text-xl font-bold tracking-tight text-text-main">Nueva línea de producto</h1>
        <p className="mt-1 text-sm text-text-muted">
          Crea una nueva línea y asígnala a una categoría existente para mantener el catálogo ordenado.
        </p>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <NuevaLineaForm />
      </div>
    </div>
  );
}
