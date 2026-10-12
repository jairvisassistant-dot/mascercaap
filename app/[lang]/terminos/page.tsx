import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";

import { termsAndConditions } from "@/data/legal";
import { SITE_CONFIG } from "@/lib/config";
import type { Locale } from "@/lib/i18n";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

// Must render per-request (dynamic), not `force-static`: the enforced CSP always
// carries a per-request nonce (see proxy.ts), and a nonce makes the browser ignore
// 'unsafe-inline'. A build-time prerender has no `x-nonce` header to read, so every
// inline script in the layout would ship nonce-less and get blocked — the page would
// render but never hydrate. Server-rendering keeps the nonce and the full policy.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.terms.title,
    description: dict.metadata.terms.description,
    robots: { index: true, follow: true },
    openGraph: {
      title: dict.metadata.terms.title,
      description: dict.metadata.terms.description,
      type: "website",
      locale: lang === "es" ? "es_CO" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.terms.title,
      description: dict.metadata.terms.description,
    },
    alternates: {
      canonical: `${SITE_CONFIG.siteUrl}/${lang}/terminos`,
      languages: {
        es: `${SITE_CONFIG.siteUrl}/es/terminos`,
        en: `${SITE_CONFIG.siteUrl}/en/terminos`,
      },
    },
  };
}

export default async function TerminosPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(lang);

  const lastUpdated = new Date(termsAndConditions.lastUpdated).toLocaleDateString(
    locale === "es" ? "es-CO" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <LegalPage
      lang={lang}
      title={termsAndConditions.title[locale]}
      lastUpdatedLabel={dict.legal.lastUpdated}
      lastUpdated={lastUpdated}
      homeLabel={dict.nav.home}
      sections={termsAndConditions.sections.map((section) => ({
        key: section.title.es,
        title: section.title[locale],
        content: section.content[locale],
      }))}
      ctaTitle={dict.legal.terms.ctaTitle}
      ctaText={dict.legal.ctaText}
      ctaButton={dict.legal.ctaButton}
      email={SITE_CONFIG.emailContact}
    />
  );
}
