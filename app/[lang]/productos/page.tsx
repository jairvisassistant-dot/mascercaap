import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_PRODUCTS_QUERY } from "@/sanity/lib/queries";
import { products as staticProducts, productLines } from "@/data/products";
import { getDictionary, hasLocale } from "@/lib/i18n";
import ProductosClient from "./ProductosClient";
import { SITE_CONFIG } from "@/lib/config";
import { safeFetch } from "@/lib/sanity/safeFetch";

export const revalidate = 3600;

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
      images: [{ url: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.ogImagePath}`, width: 1536, height: 1024, alt: "Mas Cerca AP - catálogo de productos" }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.products.title,
      description: dict.metadata.products.description,
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

  const rawProducts = await safeFetch(ALL_PRODUCTS_QUERY, {}, staticProducts);

  const products = rawProducts.map((p: (typeof staticProducts)[0]) => {
    // Si existe imagen local nueva (no la foto genérica fruta-*.webp), usarla sobre Sanity
    const staticMatch = staticProducts.find((s) => s.id === p.id);
    const hasNewLocalImage = staticMatch?.image && !staticMatch.image.includes("/imgs/fruta-");
    const image = hasNewLocalImage ? staticMatch!.image : p.image;

    if (p.line === "kumiss" && !image) {
      return { ...p, image: "/imgs/Kumis-HatoV2.webp", presentation: "1L" };
    }
    return { ...p, image };
  });

  return (
    <ProductosClient
      key={categoria ?? "todas"}
      products={products}
      productLines={productLines}
      initialCategory={categoria}
    />
  );
}
