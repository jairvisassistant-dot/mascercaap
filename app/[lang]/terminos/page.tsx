import { getDictionary, hasLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { termsAndConditions } from "@/data/legal";
import type { Locale } from "@/lib/i18n";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "es" ? "Términos y Condiciones — Mas Cerca AP" : "Terms and Conditions — Mas Cerca AP",
    robots: { index: true, follow: true },
  };
}

export default async function TerminosPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(lang);

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link href={`/${lang}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-8">
        ← {dict.nav.home}
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {termsAndConditions.title[locale]}
      </h1>
      <p className="text-sm text-gray-400 mb-10">
        {locale === "es" ? "Última actualización" : "Last updated"}:{" "}
        {new Date(termsAndConditions.lastUpdated).toLocaleDateString(
          locale === "es" ? "es-CO" : "en-US",
          { year: "numeric", month: "long", day: "numeric" }
        )}
      </p>

      <div className="space-y-8">
        {termsAndConditions.sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {section.title[locale]}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {section.content[locale]}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
