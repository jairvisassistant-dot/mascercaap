import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import NosotrosPageContent from "@/components/sections/NosotrosPageContent";

type Props = { params: Promise<{ lang: string }> };

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
    },
  };
}

export default async function NosotrosPage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return <NosotrosPageContent />;
}
