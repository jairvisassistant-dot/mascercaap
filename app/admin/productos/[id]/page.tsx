import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import ProductoForm from "../ProductoForm";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditarProductoPage({ params }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) redirect("/admin/login");
  const { data: { user }, error: authError } = await adminClient().auth.getUser(token);
  if (authError || !user) redirect("/admin/login");

  const { id } = await params;
  const supabase = adminClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) notFound();

  const initial = {
    id: product.id,
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
    <div className="min-h-[100dvh] bg-surface-soft">
      <header className="border-b border-border-soft bg-surface-card/95 px-6 py-4 shadow-[0_14px_40px_-32px_rgba(47,111,54,0.35)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1680px] items-center gap-4">
        <Link href="/admin/productos" className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main">
          ← Volver
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-dark">Editar producto</p>
          <h1 className="text-xl font-bold tracking-tight text-text-main">{product.name}</h1>
          <p className="text-xs text-text-muted">{product.id}</p>
        </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1680px] p-6 lg:px-8">
        <ProductoForm mode="edit" initial={initial} productId={product.id} />
      </div>
    </div>
  );
}
