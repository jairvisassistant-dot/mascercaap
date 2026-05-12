import { requireAdminSession } from "@/lib/admin-session";
import ProductoForm from "../ProductoForm";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  await requireAdminSession();

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Catálogo interno</p>
        <h1 className="text-xl font-bold tracking-tight text-text-main">Nuevo producto</h1>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <ProductoForm mode="create" />
      </div>
    </div>
  );
}
