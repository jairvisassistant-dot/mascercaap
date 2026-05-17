"use client"

import { m, AnimatePresence } from "framer-motion"
import type { Dictionary } from "@/lib/i18n"
import type { ProductLineConfig, ProductLineKey } from "@/types"

type Props = {
  dict: Dictionary
  isSticky: boolean
  categoryOrder: string[]
  catLabels: Record<string, string>
  activeCategory: string
  hasInteracted: boolean
  showSubFilter: boolean
  categorySubLines: ProductLineConfig[]
  activeSubLines: ProductLineKey[]
  availableSizes: string[]
  activeSize: string
  hasActiveFilters: boolean
  pl: Record<string, { label: string; description: string }>
  onSelectCategory: (cat: string) => void
  onToggleSubLine: (key: ProductLineKey) => void
  onSelectSize: (size: string) => void
  onClearAll: () => void
}

export function ProductsFilterBar({
  dict, isSticky, categoryOrder, catLabels, activeCategory,
  hasInteracted, showSubFilter, categorySubLines, activeSubLines,
  availableSizes, activeSize, hasActiveFilters, pl,
  onSelectCategory, onToggleSubLine, onSelectSize, onClearAll,
}: Props) {
  return (
    <div
      className={`sticky z-40 border-b transition-all duration-500 ${
        isSticky ? "bg-primary-light border-primary-light shadow-md" : "bg-surface-page border-border-soft shadow-sm"
      }`}
      style={{ top: "var(--navbar-h, 92px)" }}
    >
      {/* Level 1 — categories */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark" : "text-text-faint"}`}>
          {dict.products.filters.category}
        </span>
        {categoryOrder.map((cat) => {
          const isActive = activeCategory === cat
          return (
            <button
              type="button"
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
                isActive
                  ? "bg-accent text-white border-accent shadow-sm"
                  : isSticky
                    ? "bg-white/30 text-primary-dark border-white/25 hover:bg-white/50 hover:border-white/40"
                    : "bg-surface-card text-text-muted border-border-soft hover:border-primary hover:text-primary"
              }`}
            >
              {catLabels[cat]}
              {isActive && (
                <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          )
        })}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            aria-label={dict.products.filters.clear}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-page hover:bg-red-50 text-text-faint hover:text-red-500 transition-all duration-200 hover:scale-110 ml-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Level 2 — sub-lines + sizes (only after user interaction) */}
      <AnimatePresence>
        {hasInteracted && (showSubFilter || availableSizes.length > 0) && (
          <m.div
            key={activeCategory}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={`border-t transition-colors duration-500 ${isSticky ? "border-white/30" : "border-border-soft"}`}>
              <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">

                {showSubFilter && (
                  <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0 min-w-0">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-text-faint"}`}>
                      {dict.products.filters.flavor}
                    </span>
                    {categorySubLines.map((line) => {
                      const isActive = activeSubLines.includes(line.key)
                      return (
                        <button
                          type="button"
                          key={line.key}
                          onClick={() => onToggleSubLine(line.key)}
                          className={`flex shrink-0 items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
                            isActive
                              ? "bg-primary/15 text-primary-dark border-primary/40 shadow-sm"
                              : isSticky
                                ? "bg-white/25 text-primary-dark border-white/20 hover:bg-white/40"
                                : "bg-surface-card text-text-muted border-border-soft hover:border-primary/30 hover:text-primary"
                          }`}
                        >
                          <span>{line.iconEmoji}</span>
                          <span>{pl[line.key]?.label ?? line.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {availableSizes.length > 0 && activeSubLines.length !== 1 && (
                  <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 md:shrink-0 md:self-start md:overflow-visible md:pb-0">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-text-faint"}`}>
                      {dict.products.filters.size}
                    </span>
                    <div className="flex gap-1.5">
                      {["todos", ...availableSizes].map((size) => (
                        <button
                          type="button"
                          key={size}
                          onClick={() => onSelectSize(size)}
                          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
                            activeSize === size
                              ? "bg-accent text-white border-accent shadow-sm"
                              : isSticky
                                ? "bg-white/30 text-primary-dark border-white/25 hover:bg-white/50"
                                : "bg-surface-card text-text-muted border-border-soft hover:border-accent hover:text-accent"
                          }`}
                        >
                          {size === "todos" ? dict.products.filters.all : size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
