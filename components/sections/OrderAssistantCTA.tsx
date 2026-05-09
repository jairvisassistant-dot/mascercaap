"use client"

import { useDictionary } from "@/lib/i18n/DictionaryProvider"
import { useHelpHub } from "@/lib/help-hub-context"

export default function OrderAssistantCTA() {
  const { dict } = useDictionary()
  const t = dict.orderAssistant
  const { openDrawer } = useHelpHub()

  return (
    <section className="py-16 bg-surface-card border-y border-border-soft">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 rounded-2xl bg-primary/5 border border-primary/15 px-8 py-10">
          <div className="flex items-start gap-5">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-text-main mb-1.5 leading-tight">
                {t.homeCTATitle}
              </h2>
              <p className="text-text-muted text-sm leading-relaxed max-w-md">
                {t.homeCTASubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openDrawer("order")}
            className="shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors min-h-[44px] whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            {t.homeCTAButton}
          </button>
        </div>
      </div>
    </section>
  )
}
