"use client";

import type { LegalDocument } from "@/data/legal";
import type { Locale } from "@/lib/i18n";

type Props = { document: LegalDocument; lang: Locale };

export default function LegalView({ document: doc, lang }: Props) {
  const locale = lang;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <p className="text-xs text-gray-400 mb-6">
        {locale === "es" ? "Última actualización" : "Last updated"}: {new Date(doc.lastUpdated).toLocaleDateString(locale === "es" ? "es-CO" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="space-y-6">
        {doc.sections.map((section, i) => (
          <div key={i}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {section.title[locale]}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {section.content[locale]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
