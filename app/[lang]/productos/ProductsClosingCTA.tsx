import Link from "next/link"
import type { Dictionary } from "@/lib/i18n"

type Props = { dict: Dictionary; lang: string }

export function ProductsClosingCTA({ dict, lang }: Props) {
  return (
    <section className="py-16 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/8 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block mb-4">
              {dict.products.cta.badge}
            </span>
            <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
              {dict.products.cta.title}
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {dict.products.cta.text}
            </p>
            <Link
              href={`/${lang}/contacto`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-full transition-all hover:scale-105 shadow-lg shadow-primary/30"
            >
              {dict.products.cta.button}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {dict.products.cta.stats.map((stat, i) => (
              <div
                key={i}
                className="fade-in-up bg-white/5 border border-white/10 rounded-xl p-5 text-center"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <span className="text-3xl font-bold text-primary block mb-1">{stat.value}</span>
                <span className="text-gray-400 text-xs leading-snug">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
