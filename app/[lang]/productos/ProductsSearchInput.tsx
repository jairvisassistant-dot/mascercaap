"use client"

import type { Dictionary } from "@/lib/i18n"

type Props = {
  searchQuery: string
  onSearchChange: (q: string) => void
  onClearSearch: () => void
  dict: Dictionary
}

export function ProductsSearchInput({
  searchQuery,
  onSearchChange,
  onClearSearch,
  dict,
}: Props) {
  return (
    <div className="relative max-w-md mx-auto mt-7">
      <label htmlFor="catalog-search" className="sr-only">
        {dict.products.filters.search}
      </label>
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/55 pointer-events-none"
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
          className="w-full pl-11 pr-10 py-3 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white placeholder:text-white/55 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 text-sm font-medium transition-[box-shadow,outline-color,background-color]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            aria-label={dict.products.filters.clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 size-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/35 text-white transition-[background-color]"
          >
            <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
