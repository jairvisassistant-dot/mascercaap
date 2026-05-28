"use client"

import React from "react"
import { m } from "framer-motion"
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
  resolvePrice: ReturnType<typeof import("@/lib/order-assistant").buildPriceResolver>
  t: {
    cartLabel: string
    packShort: string
    unitsShort: string
    removeItem: string
    subtotalLabel: string
    totalLabel: string
    taxIncludedNote: string
    priceNote: string
    freeDelivery120gHint: string
    addAnother: string
    continueLabel: string
  }
  dispatch: React.Dispatch<Action>
}

export default function OrderCart({
  items, totals, has120gItems, freeDeliveryMessage, deliveryInfo,
  resolvePrice, t, dispatch,
}: Props) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <p className="text-sm font-semibold text-text-main">
        <span className="text-primary mr-2">🛒</span>{t.cartLabel}
      </p>

      {/* Item list */}
      <div className="rounded-xl border border-border-soft overflow-hidden">
        {items.map((item, i) => {
          const lineTotal = calculateItemLineTotal(item, resolvePrice)
          const qtyLabel = is120gPackPresentation(item.presentation)
            ? `${item.quantity} ${t.packShort}`
            : `${item.quantity} ${t.unitsShort}`
          return (
            <div
              key={`${i}-${item.fruit}-${item.presentation}`}
              className="flex items-center justify-between px-4 py-3 border-b border-border-soft last:border-0 bg-surface-card"
            >
              <div>
                <p className="text-sm font-medium text-text-main">
                  {item.fruit}{item.presentation ? ` ${item.presentation}` : ""}
                </p>
                <p className="text-xs text-text-muted">
                  {qtyLabel}
                  {lineTotal !== null && (
                    <span className="ml-2 text-text-sub">{formatCOP(lineTotal)}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "removeItem", index: i })}
                className="text-xs text-red-500 hover:text-red-700 transition-colors min-h-[36px] px-2"
                aria-label={`${t.removeItem} ${item.fruit}`}
              >
                {t.removeItem}
              </button>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      {totals?.hasPrice && (
        <div className="rounded-xl bg-surface-page border border-border-soft p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">{t.subtotalLabel}</span>
            <span className="text-text-muted">{formatCOP(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-border-soft pt-1.5">
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
        </div>
      )}

      {/* Cart actions */}
      <button
        type="button"
        onClick={() => dispatch({ type: "editStep1" })}
        className="w-full text-sm text-primary border border-primary/30 rounded-full px-4 py-2.5 hover:bg-primary/5 transition-colors min-h-[44px]"
      >
        {t.addAnother}
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: "goToStep", step: 6 })}
        disabled={items.length === 0}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px] disabled:opacity-50"
      >
        {t.continueLabel}
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </m.div>
  )
}
