import { getDictionary, hasLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { privacyPolicy } from "@/data/legal";
import type { Locale } from "@/lib/i18n";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "es" ? "Políticas y Privacidad — Mas Cerca AP" : "Privacy Policy — Mas Cerca AP",
    robots: { index: true, follow: true },
  };
}

export default async function PoliticasPage({ params }: { params: Promise<{ lang: string }> }) {
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
        {privacyPolicy.title[locale]}
      </h1>
      <p className="text-sm text-gray-400 mb-10">
        {locale === "es" ? "Última actualización" : "Last updated"}:{" "}
        {new Date(privacyPolicy.lastUpdated).toLocaleDateString(
          locale === "es" ? "es-CO" : "en-US",
          { year: "numeric", month: "long", day: "numeric" }
        )}
      </p>

      <div className="space-y-8">
        {privacyPolicy.sections.map((section, i) => (
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
