"use client"

import React from "react"
import { m, AnimatePresence } from "framer-motion"
import {
  calculateItemLineTotal,
  is120gPackPresentation,
  formatCOP,
} from "@/lib/order-assistant"
import type { OrderItem } from "@/lib/schemas/order"
import type { Action } from "./types"

type Totals = {
  hasPrice: boolean
  subtotal: number
  total: number
}

type DeliveryInfo = {
  qualifiesFreeDelivery: boolean
  missingAmount: number
} | null

type Props = {
  items: OrderItem[]
  totals: Totals | null
  has120gItems: boolean
  freeDeliveryMessage: string | null
  deliveryInfo: DeliveryInfo
  waUrl: string | null
  resolvePrice: ReturnType<typeof import("@/lib/order-assistant").buildPriceResolver>
  t: {
    successTitle: string
    successText: string
    packShort: string
    unitsShort: string
    subtotalLabel: string
    totalLabel: string
    taxIncludedNote: string
    priceNote: string
    freeDelivery120gHint: string
    ctaWhatsapp: string
    successNoWhatsapp: string
    resetLabel: string
  }
  dispatch: React.Dispatch<Action>
}

export default function OrderSuccess({
  items, totals, has120gItems, freeDeliveryMessage, deliveryInfo,
  waUrl, resolvePrice, t, dispatch,
}: Props) {
  return (
    <AnimatePresence mode="wait">
      <m.div
        key="result"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center py-4"
      >
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg className="size-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-text-main mb-2">{t.successTitle}</h3>
        <p className="text-text-muted text-sm mb-6">{t.successText}</p>

        {/* Order summary */}
        {totals && (
          <div className="w-full text-left bg-surface-page rounded-xl border border-border-soft p-4 mb-5 space-y-2">
            {items.map((item, i) => {
              const lineTotal = calculateItemLineTotal(item, resolvePrice)
              const qtyLabel = is120gPackPresentation(item.presentation)
                ? `${item.quantity} ${t.packShort}`
                : `${item.quantity} ${t.unitsShort}`
              return (
                <div key={`${i}-${item.fruit}-${item.presentation}`} className="flex justify-between text-sm">
                  <span className="text-text-sub">{item.fruit}{item.presentation ? ` ${item.presentation}` : ""} × {qtyLabel}</span>
                  <span className="text-text-muted">{lineTotal !== null ? formatCOP(lineTotal) : "—"}</span>
                </div>
              )
            })}
            {totals.hasPrice && (
              <>
                <div className="border-t border-border-soft pt-2 flex justify-between text-sm">
                  <span className="text-text-muted">{t.subtotalLabel}</span>
                  <span className="text-text-muted">{formatCOP(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-text-main">{t.totalLabel}</span>
                  <span className="text-primary">{formatCOP(totals.total)}</span>
                </div>
                <p className="text-[11px] font-medium text-text-muted">{t.taxIncludedNote}</p>
                <p className="text-[11px] text-text-faint">{t.priceNote}</p>
                {freeDeliveryMessage && (
                  <p className={`text-[11px] font-semibold ${deliveryInfo?.qualifiesFreeDelivery ? "text-green-700" : "text-amber-700"}`}>
                    {freeDeliveryMessage}
                  </p>
                )}
                {has120gItems && (
                  <p className="text-[11px] text-text-faint">{t.freeDelivery120gHint}</p>
                )}
              </>
            )}
          </div>
        )}

        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px] mb-3"
          >
            <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.857L0 24l6.335-1.518A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.092-1.424l-.366-.217-3.762.902.944-3.653-.238-.374A9.776 9.776 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
            </svg>
            {t.ctaWhatsapp}
          </a>
        )}

        {!waUrl && (
          <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
            {t.successNoWhatsapp}
          </p>
        )}

        <button
          type="button"
          onClick={() => dispatch({ type: "reset" })}
          className="text-sm text-text-muted underline underline-offset-2 hover:text-text-main transition-colors min-h-[44px]"
        >
          {t.resetLabel}
        </button>
      </m.div>
    </AnimatePresence>
  )
}
