import { requireAdminSession } from "@/lib/admin-session";
import NuevaCategoriaForm from "../NuevaCategoriaForm";

export const dynamic = "force-dynamic";

export default async function NuevaCategoriaPage() {
  await requireAdminSession();

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Catálogo interno
        </p>
        <h1 className="text-xl font-bold tracking-tight text-text-main">Nueva categoría</h1>
        <p className="mt-1 text-sm text-text-muted">
          Las categorías agrupan las líneas de producto (ej: Zumos, Pulpas, Lácteos).
        </p>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <NuevaCategoriaForm />
      </div>
    </div>
  );
}
