import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin/session";
import ImagenesAdminClient, { type ProductRow } from "./ImagenesAdminClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const dynamic = "force-dynamic";

export default async function ImagenesAdminPage() {
  await requireAdminSession();

  const sb = adminClient();
  const [{ data: products }, { data: linesData }] = await Promise.all([
    sb
      .from("products")
      .select("id, name, line, image, display_order")
      .eq("active", true)
      .order("display_order"),
    sb
      .from("product_lines")
      .select("key, label")
      .eq("active", true),
  ]);

  const lineLabels: Record<string, string> = {};
  for (const l of linesData ?? []) {
    lineLabels[l.key] = l.label;
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">
          Catálogo interno
        </p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight text-text-main">
          Imágenes de productos
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Seleccioná uno o varios productos y cargá sus imágenes en lote.
        </p>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 pt-4 lg:px-8">
        <ImagenesAdminClient
          initialProducts={(products ?? []) as ProductRow[]}
          lineLabels={lineLabels}
        />
      </div>
    </div>
  );
}
