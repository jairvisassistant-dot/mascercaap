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
    <div className="min-h-screen">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/admin/productos" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← Volver
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white">{product.name}</h1>
          <p className="text-gray-500 text-xs">{product.id}</p>
        </div>
      </header>
      <div className="p-6">
        <ProductoForm mode="edit" initial={initial} productId={product.id} />
      </div>
    </div>
  );
}
