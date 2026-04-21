import { notFound } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HelpHub from "@/components/ui/HelpHub";
import { SITE_CONFIG } from "@/lib/config";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

function getJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Mas Cerca Ap",
    url: SITE_CONFIG.siteUrl,
    logo: `${SITE_CONFIG.siteUrl}/logo.png`,
    description:
      lang === "es"
        ? "Productores de jugos y cítricos 100% naturales en Colombia."
        : "Producers of 100% natural juices and citrus fruits in Colombia.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chia",
      addressRegion: "Cundinamarca",
      addressCountry: "CO",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_CONFIG.phoneTel,
      contactType: "customer service",
      availableLanguage: lang === "es" ? "Spanish" : "English",
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const jsonLd = getJsonLd(lang);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DictionaryProvider dict={dict} lang={lang}>
        <div className="min-h-screen flex flex-col overflow-x-clip">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer dict={dict} lang={lang} />
          <HelpHub />
        </div>
      </DictionaryProvider>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </>
  );
}
