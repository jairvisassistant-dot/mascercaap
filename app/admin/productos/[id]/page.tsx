import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-session";
import ProductoForm from "../ProductoForm";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditarProductoPage({ params }: Props) {
  await requireAdminSession();

  const { id } = await params;
  const { data: product, error } = await adminClient()
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) notFound();

  const initial = {
    name: product.name,
    line: product.line,
    presentation: product.presentation,
    presentationOrder: product.presentation_order,
    price: product.price !== null ? String(product.price) : "",
    image: product.image ?? "",
    description: product.description,
    ingredients: product.ingredients ?? [],
    benefits: product.benefits ?? [],
    isSoldOut: product.is_sold_out,
    isBestSeller: product.is_best_seller,
    featured: product.featured,
    active: product.active,
    displayOrder: product.display_order,
  };

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1680px] px-6 pb-3 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Editar producto</p>
        <h1 className="text-xl font-bold tracking-tight text-text-main">{product.name}</h1>
        <p className="text-xs text-text-muted">{product.id}</p>
      </div>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <ProductoForm mode="edit" initial={initial} productId={product.id} />
      </div>
    </div>
  );
}
