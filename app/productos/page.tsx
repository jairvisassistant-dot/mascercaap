import { client } from "@/sanity/lib/client";
import { ALL_PRODUCTS_QUERY } from "@/sanity/lib/queries";
import { products as staticProducts, productLines } from "@/data/products";
import ProductosClient from "./ProductosClient";

// Revalida la página cada 60 segundos (ISR)
export const revalidate = 60;

type SearchParams = Promise<{ categoria?: string }>;

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { categoria } = await searchParams;

  // Fetchea de Sanity; si falla (ej: variables no configuradas), usa datos estáticos
  const rawProducts = await client
    .fetch(ALL_PRODUCTS_QUERY)
    .catch(() => staticProducts);

  // Temporal: inyecta la imagen local del Kumiss hasta que el cliente la suba a Sanity
  const products = rawProducts.map((p: (typeof staticProducts)[0]) =>
    p.line === "kumiss" && !p.image
      ? { ...p, image: "/imgs/KumisAP.webp", presentation: "1L" }
      : p
  );

  // productLines es config de UI, no contenido CMS — viene siempre del archivo local
  return (
    <ProductosClient
      products={products}
      productLines={productLines}
      initialCategory={categoria}
    />
  );
}
