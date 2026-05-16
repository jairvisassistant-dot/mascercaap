import { Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { MotionProvider } from "@/lib/i18n/MotionProvider";
import { HelpHubProvider } from "@/lib/help-hub-context";
import { FAQProvider } from "@/lib/faq-provider";
import { PriceProvider } from "@/lib/prices/PriceProvider";
import { supabase } from "@/lib/supabase";
import { getFAQData } from "@/lib/faq-data";
import { getAllProductCategories } from "@/lib/supabase/queries";
import type { PriceEntry } from "@/lib/order-assistant";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HelpHub from "@/components/ui/HelpHub";
import ScrollProgress from "@/components/ui/ScrollProgress";
import CookieConsent from "@/components/ui/CookieConsent";
import { SITE_CONFIG } from "@/lib/config";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const revalidate = 60;

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

function getOrganizationJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Más Cerca AP",
    url: SITE_CONFIG.siteUrl,
    logo: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.logoPath}`,
    description:
      lang === "es"
        ? "Productores de jugos y cítricos 100% naturales en Colombia."
        : "Producers of 100% natural juices and citrus fruits in Colombia.",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.address,
      addressLocality: "Chía",
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

function getWebSiteJsonLd(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Más Cerca AP",
    url: SITE_CONFIG.siteUrl,
    inLanguage: lang === "es" ? "es-CO" : "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.siteUrl}/${lang}/productos?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function getFaqJsonLd(faqData: Awaited<ReturnType<typeof getFAQData>>, lang: Locale) {
  const questions = faqData.categories
    .flatMap((cat) => cat.questions)
    .slice(0, 6)
    .map((q) => ({
      "@type": "Question",
      name: q.question[lang],
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer[lang],
      },
    }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions,
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
  const faqData = await getFAQData();
  const organizationJsonLd = getOrganizationJsonLd(lang);
  const webSiteJsonLd = getWebSiteJsonLd(lang);
  const faqJsonLd = getFaqJsonLd(faqData, lang);

  let prices: PriceEntry[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("products")
      .select("line, name, presentation, price")
      .not("price", "is", null);
    if (data?.length) prices = data as PriceEntry[];
  }

  const categories = await getAllProductCategories();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className={`${poppins.variable} font-poppins antialiased min-h-screen flex flex-col overflow-x-clip`}>
        <MotionProvider>
          <PriceProvider prices={prices}>
          <DictionaryProvider dict={dict} lang={lang}>
            <FAQProvider data={faqData}>
            <HelpHubProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {lang === "es" ? "Saltar al contenido" : "Skip to content"}
              </a>
              <ScrollProgress />
              <Navbar />
              <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
              <Footer dict={dict} lang={lang} categories={categories} />
              <HelpHub />
            </HelpHubProvider>
            </FAQProvider>
          </DictionaryProvider>
          </PriceProvider>
        </MotionProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <CookieConsent gaId={process.env.NEXT_PUBLIC_GA_ID} dict={dict} lang={lang} />
        )}
      </div>
    </>
  );
}
