import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import ContactoPageContent from "@/components/sections/ContactoPageContent";
import { SITE_CONFIG } from "@/lib/config";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.contact.title,
    description: dict.metadata.contact.description,
    openGraph: {
      title: dict.metadata.contact.title,
      description: dict.metadata.contact.description,
      type: "website",
      locale: lang === "es" ? "es_CO" : "en_US",
      images: [{ url: `${SITE_CONFIG.siteUrl}/imgs/Logo.png`, width: 97, height: 60, alt: "Mas Cerca AP" }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.contact.title,
      description: dict.metadata.contact.description,
    },
    alternates: {
      canonical: `${SITE_CONFIG.siteUrl}/${lang}/contacto`,
      languages: {
        es: `${SITE_CONFIG.siteUrl}/es/contacto`,
        en: `${SITE_CONFIG.siteUrl}/en/contacto`,
      },
    },
  };
}

export default async function ContactoPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <ContactoPageContent />;
}
