import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import ContactoPageContent from "@/components/sections/ContactoPageContent";

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
    },
  };
}

export default async function ContactoPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <ContactoPageContent />;
}
