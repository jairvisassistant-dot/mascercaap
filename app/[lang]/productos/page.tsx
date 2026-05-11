import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import ProductosClient from "./ProductosClient";
import { SITE_CONFIG } from "@/lib/config";
import { getAllProducts, getAllProductLines, getAllProductCategories } from "@/lib/supabase/queries";

export const revalidate = 60;

type Props = {
  params: Promise<{ lang: string }>;
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

export default async function ProductosPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const [products, productLines, categories] = await Promise.all([
    getAllProducts(),
    getAllProductLines(),
    getAllProductCategories(),
  ]);

  return (
    <ProductosClient
      products={products}
      productLines={productLines}
      categories={categories}
    />
  );
}
