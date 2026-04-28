import { Poppins, DM_Serif_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { MotionProvider } from "@/lib/i18n/MotionProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HelpHub from "@/components/ui/HelpHub";
import ScrollProgress from "@/components/ui/ScrollProgress";
import { SITE_CONFIG } from "@/lib/config";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
});

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
    <html lang={lang} suppressHydrationWarning>
      <body className={`${poppins.variable} ${dmSerif.variable} font-poppins antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MotionProvider>
          <DictionaryProvider dict={dict} lang={lang}>
            <ScrollProgress />
            <div className="min-h-screen flex flex-col overflow-x-clip">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer dict={dict} lang={lang} />
              <HelpHub />
            </div>
          </DictionaryProvider>
        </MotionProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
