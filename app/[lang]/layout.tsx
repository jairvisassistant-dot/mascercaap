import { Poppins, DM_Serif_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { MotionProvider } from "@/lib/i18n/MotionProvider";
import { HelpHubProvider } from "@/lib/help-hub-context";
import { supabasePublic as supabase } from "@/lib/supabase";
import { getFAQData } from "@/lib/faq-data";
import { getAllProductCategories } from "@/lib/supabase/queries";
import type { PriceEntry, CatalogLine } from "@/lib/order-assistant";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HelpHub from "@/components/ui/HelpHub";
import ScrollProgress from "@/components/ui/ScrollProgress";
import PageTracker from "@/components/ui/PageTracker";
import { SITE_CONFIG } from "@/lib/config";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

export const revalidate = 3600;

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
  let lines: CatalogLine[] = [];
  if (supabase) {
    const [{ data: productData }, { data: lineData }] = await Promise.all([
      supabase
        .from("products")
        .select("id, line, name, presentation, presentation_order, price")
        .not("price", "is", null),
      supabase
        .from("product_lines")
        .select("key, label, category_key, display_order, order_assistant_enabled, order_assistant_label")
        .eq("active", true)
        .order("display_order"),
    ]);
    if (productData?.length) prices = productData as PriceEntry[];
    if (lineData?.length)    lines  = lineData  as CatalogLine[];
  }

  const categories = await getAllProductCategories();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className={`${poppins.variable} ${dmSerifDisplay.variable} font-poppins antialiased min-h-screen flex flex-col overflow-x-clip`}>
        <MotionProvider>
          <DictionaryProvider dict={dict} lang={lang}>
            <HelpHubProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {lang === "es" ? "Saltar al contenido" : "Skip to content"}
              </a>
              <PageTracker />
              <ScrollProgress />
              <Navbar />
              <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
              <Footer dict={dict} lang={lang} categories={categories} />
              <HelpHub faqData={faqData} prices={prices} lines={lines} />
            </HelpHubProvider>
          </DictionaryProvider>
        </MotionProvider>
      </div>
    </>
  );
}
