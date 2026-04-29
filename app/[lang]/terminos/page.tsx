import { getDictionary, hasLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { termsAndConditions } from "@/data/legal";
import { SITE_CONFIG } from "@/lib/config";
import type { Locale } from "@/lib/i18n";
import type { Metadata } from "next";
import Link from "next/link";

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
      card: "summary",
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
    <div className="pt-20">

      {/* Header — compromiso documentado */}
      <div className="bg-gradient-to-br from-primary-dark to-primary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <svg viewBox="0 0 600 200" className="absolute right-0 top-0 h-full w-auto opacity-10" fill="none">
            <circle cx="500" cy="100" r="180" fill="white" />
            <circle cx="580" cy="40" r="80" fill="white" />
          </svg>
          <svg viewBox="0 0 400 300" className="absolute -left-16 -bottom-8 h-48 w-auto opacity-5" fill="white">
            <path d="M200 0 C80 60 0 140 40 220 C80 300 200 280 280 200 C360 120 380 40 300 0 Z" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12 relative z-10">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {dict.nav.home}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            {termsAndConditions.title[locale]}
          </h1>
          <p className="text-white/60 text-sm">
            {locale === "es" ? "Última actualización" : "Last updated"}: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Contenido */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-10">
          {termsAndConditions.sections.map((section, i) => (
            <div key={i} className="border-l-2 border-primary/30 pl-6">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                {section.title[locale]}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {section.content[locale]}
              </p>
            </div>
          ))}
        </div>

        {/* CTA de contacto */}
        <div className="mt-14 rounded-2xl bg-primary/5 border border-primary/15 p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm mb-0.5">
              {dict.legal.terms.ctaTitle}
            </p>
            <p className="text-gray-500 text-sm">
              {dict.legal.ctaText}{" "}
              <a href={`mailto:${SITE_CONFIG.emailContact}`} className="text-primary hover:underline">
                {SITE_CONFIG.emailContact}
              </a>
            </p>
          </div>
          <Link
            href={`/${lang}/contacto`}
            className="shrink-0 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105"
          >
            {dict.legal.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
