import { Poppins, DM_Serif_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { MotionProvider } from "@/lib/i18n/MotionProvider";
import { HelpHubProvider } from "@/lib/help-hub-context";
import { supabasePublic as supabase } from "@/lib/supabase";
import { getFAQData } from "@/lib/faq-data";
import { serializeJsonLd } from "@/lib/json-ld";
import { getAllProductCategories, getAllProductLines, getAllProducts } from "@/lib/supabase/queries";
import type { PriceEntry, CatalogLine } from "@/lib/order-assistant";
import type { Product, ProductCategory, ProductLineConfig } from "@/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HelpHub from "@/components/ui/HelpHub";
import ScrollProgress from "@/components/ui/ScrollProgress";
import { headers } from "next/headers";
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
    name: "Mas Cerca AP",
    url: SITE_CONFIG.siteUrl,
    logo: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.logoPath}`,
    description:
      lang === "es"
        ? "Productores de zumos concentrados y pulpas de fruta en Colombia."
        : "Producers of concentrated zumos and fruit pulps in Colombia.",
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
    name: "Mas Cerca AP",
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

  const [dict, faqData, hdrs] = await Promise.all([
    getDictionary(lang),
    getFAQData(),
    headers(),
  ]);
  const nonce = hdrs.get("x-nonce") ?? undefined;
  const organizationJsonLd = getOrganizationJsonLd(lang);
  const webSiteJsonLd = getWebSiteJsonLd(lang);
  const faqJsonLd = getFaqJsonLd(faqData, lang);

  let prices: PriceEntry[] = [];
  let lines: CatalogLine[] = [];
  let productLines: ProductLineConfig[] = [];
  let products: Product[] = [];
  let categories: ProductCategory[] = [];

  const [supabaseResult, rawCategories, rawProductLines, rawProducts] = await Promise.all([
    supabase
      ? Promise.all([
          supabase
            .from("products")
            .select("id, line, name, presentation, presentation_order, price")
            .not("price", "is", null),
          supabase
            .from("product_lines")
            .select("key, label, category_key, display_order, order_assistant_enabled, order_assistant_label")
            .eq("active", true)
            .order("display_order"),
        ])
      : null,
    getAllProductCategories(),
    getAllProductLines(),
    getAllProducts(),
  ]);

  categories = rawCategories.filter((c) => c.key !== "todas");
  productLines = rawProductLines;
  products = rawProducts;

  if (supabaseResult) {
    const [{ data: productData, error: productErr }, { data: lineData, error: lineErr }] = supabaseResult;
    if (productErr) console.error("[layout] products query failed:", productErr.message.slice(0, 120));
    if (lineErr)    console.error("[layout] product_lines query failed:", lineErr.message.slice(0, 120));
    if (productData?.length) prices = productData as PriceEntry[];
    if (lineData?.length)    lines  = lineData  as CatalogLine[];
  }

  return (
    <>
      {/* JSON-LD: serializeJsonLd() escapes `<`/`>` as unicode escapes so no value can
          close this script tag early. Required here because the FAQ payload is built from
          database content (admin-authored questions/answers and product names). */}
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }} />
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(webSiteJsonLd) }} />
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
      <div className={`${poppins.variable} ${dmSerifDisplay.variable} font-poppins antialiased min-h-screen flex flex-col overflow-x-clip`}>
        <MotionProvider>
          <HelpHubProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {dict.nav.skipToContent}
            </a>
            <ScrollProgress />
            <Navbar dict={dict} lang={lang} />
            <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
            <Footer dict={dict} lang={lang} categories={categories} />
            <HelpHub dict={dict} lang={lang} faqData={faqData} prices={prices} lines={lines} categories={categories} productLines={productLines} products={products} />
          </HelpHubProvider>
        </MotionProvider>
      </div>
    </>
  );
}
