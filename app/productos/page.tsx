import { client } from "@/sanity/lib/client";
import { ALL_PRODUCTS_QUERY } from "@/sanity/lib/queries";
import { products as staticProducts, productLines } from "@/data/products";
import ProductosClient from "./ProductosClient";

// Revalida la página cada 60 segundos (ISR)
export const revalidate = 60;

export default async function ProductosPage() {
  // Fetchea de Sanity; si falla (ej: variables no configuradas), usa datos estáticos
  const products = await client
    .fetch(ALL_PRODUCTS_QUERY)
    .catch(() => staticProducts);

  // productLines es config de UI, no contenido CMS — viene siempre del archivo local
  return <ProductosClient products={products} productLines={productLines} />;
}
