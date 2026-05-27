import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import ProductosClient from "./ProductosClient";
import { SITE_CONFIG } from "@/lib/config";
import { getAllProducts, getAllProductLines, getAllProductCategories } from "@/lib/supabase/queries";

export const revalidate = 60;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

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
    robots: { index: true, follow: true },
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

  const isEs = lang === "es";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: isEs ? "Inicio" : "Home",
        item: `${SITE_CONFIG.siteUrl}/${lang}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: isEs ? "Productos" : "Products",
        item: `${SITE_CONFIG.siteUrl}/${lang}/productos`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen animate-pulse bg-surface-warm" />}>
        <ProductosClient
          products={products}
          productLines={productLines}
          categories={categories}
        />
      </Suspense>
    </>
  );
}
