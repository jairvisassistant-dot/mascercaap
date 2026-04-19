import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { ALL_PRODUCTS_QUERY } from "@/sanity/lib/queries";
import { products as staticProducts, productLines } from "@/data/products";
import { getDictionary, hasLocale } from "@/lib/i18n";
import ProductosClient from "./ProductosClient";
import { SITE_CONFIG } from "@/lib/config";

export const revalidate = 60;

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ categoria?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.products.title,
    description: dict.metadata.products.description,
    openGraph: {
      title: dict.metadata.products.title,
      description: dict.metadata.products.description,
      type: "website",
      locale: lang === "es" ? "es_CO" : "en_US",
    },
    alternates: {
      canonical: `${SITE_CONFIG.siteUrl}/${lang}/productos`,
      languages: {
        es: `${SITE_CONFIG.siteUrl}/es/productos`,
        en: `${SITE_CONFIG.siteUrl}/en/productos`,
      },
    },
  };
}

export default async function ProductosPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const { categoria } = await searchParams;

  const sanityReady =
    !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "placeholder";

  const rawProducts = sanityReady
    ? await client
        .fetch(ALL_PRODUCTS_QUERY, {}, { next: { revalidate: 3600 } })
        .catch(() => staticProducts)
    : staticProducts;

  const products = rawProducts.map((p: (typeof staticProducts)[0]) =>
    p.line === "kumiss" && !p.image
      ? { ...p, image: "/imgs/Kumis-Hato.webp", presentation: "1L" }
      : p
  );

  return (
    <ProductosClient
      products={products}
      productLines={productLines}
      initialCategory={categoria}
    />
  );
}
