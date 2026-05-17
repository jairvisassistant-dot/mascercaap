import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import NosotrosPageContent from "@/components/sections/NosotrosPageContent";
import { SITE_CONFIG } from "@/lib/config";

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.about.title,
    description: dict.metadata.about.description,
    openGraph: {
      title: dict.metadata.about.title,
      description: dict.metadata.about.description,
      type: "website",
      locale: lang === "es" ? "es_CO" : "en_US",
      images: [{ url: `${SITE_CONFIG.siteUrl}/imgs/QuieneSomos.webp`, width: 1600, height: 900, alt: "Mas Cerca AP - quiénes somos" }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.about.title,
      description: dict.metadata.about.description,
    },
    alternates: {
      canonical: `${SITE_CONFIG.siteUrl}/${lang}/nosotros`,
      languages: {
        es: `${SITE_CONFIG.siteUrl}/es/nosotros`,
        en: `${SITE_CONFIG.siteUrl}/en/nosotros`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function NosotrosPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <NosotrosPageContent dict={dict} lang={lang} />;
}
