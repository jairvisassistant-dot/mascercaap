"use client"

import { m } from "framer-motion"
import type { Dictionary } from "@/lib/i18n"

type Props = {
  dict: Dictionary
  searchQuery: string
  onSearchChange: (q: string) => void
  onClearSearch: () => void
}

export function ProductsHero({ dict, searchQuery, onSearchChange, onClearSearch }: Props) {
  return (
    <section className="relative bg-gradient-to-br from-primary-dark via-primary to-[#5f9f63] py-16 overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      <div className="absolute right-0 inset-y-0 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto opacity-[0.07]" fill="white">
          <path d="M380 0 C240 20 120 80 80 160 C40 240 120 300 220 280 C320 260 420 180 400 80 Z" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 text-center text-white relative z-10">
        <m.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold tracking-widest text-white/60 uppercase mb-4"
        >
          {dict.products.hero.eyebrow}
        </m.p>
        <m.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-dm-serif text-4xl md:text-6xl mb-4 leading-tight"
        >
          {dict.products.hero.title}
        </m.h1>
        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl opacity-85 max-w-2xl mx-auto"
        >
          {dict.products.hero.subtitle}
        </m.p>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="relative max-w-md mx-auto mt-7"
        >
          <label htmlFor="catalog-search" className="sr-only">
            {dict.products.filters.search}
          </label>
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7 7 0 1116.65 16.65z" />
            </svg>
            <input
              id="catalog-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={dict.products.filters.searchPlaceholder}
              className="w-full pl-11 pr-10 py-3 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white placeholder:text-white/55 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 text-sm font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label={dict.products.filters.clear}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/35 text-white transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </m.div>
      </div>
    </section>
  )
}
