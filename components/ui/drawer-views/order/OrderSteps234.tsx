"use client"

import React from "react"
import ChipSelector from "@/components/ui/ChipSelector"
import type { Action, Step } from "./types"
import StepBlock from "./StepBlock"

type Props = {
  step: Step
  curProductType: string | null
  curLineKey: string | null
  curPresentation: string | null
  showCustomQty: boolean
  customQty: string
  isLacteos: boolean
  isPack120gSelection: boolean
  currentSelectionLabel: string | null
  fruitOptions: { value: string; label: string; sublabel?: string }[]
  presentationOptions: { value: string; label: string; sublabel?: string }[]
  quantityOptions: { value: number; label: string }[]
  items: { length: number }
  t: {
    step2Label: string
    step4Label: string
    step5Label: string
    back: string
    customQtyLabel: string
    customQtyPlaceholder: string
    presentation120gPackNote: string
    cancelToCart: string
  }
  dispatch: React.Dispatch<Action>
  handleQtySelect: (val: number) => void
  confirmCustomQty: () => void
  CUSTOM_QTY: number
}

export default function OrderSteps234({
  step, curProductType, curLineKey, curPresentation,
  showCustomQty, customQty, isLacteos, isPack120gSelection,
  currentSelectionLabel, fruitOptions, presentationOptions, quantityOptions,
  items, t, dispatch, handleQtySelect, confirmCustomQty, CUSTOM_QTY,
}: Props) {
  return (
    <>
      {/* Step 2 — Fruit / product */}
      {typeof step === "number" && step >= 2 && (
        <StepBlock
          number={2}
          label={t.step2Label}
          active={step === 2}
          summary={currentSelectionLabel}
          onEdit={() => dispatch({ type: "editStep2" })}
          backLabel={t.back}
        >
          <ChipSelector
            options={fruitOptions}
            selected={curLineKey}
            onChange={(v) => dispatch({ type: "selectLineKey", value: v, nextStep: isLacteos ? 4 : 3 })}
          />
        </StepBlock>
      )}

      {/* Step 3 — Presentation (with price) */}
      {typeof step === "number" && step >= 3 && (
        <StepBlock
          number={3}
          label={t.step4Label}
          active={step === 3}
          summary={curPresentation}
          onEdit={() => dispatch({ type: "editStep3" })}
          backLabel={t.back}
        >
          <ChipSelector
            options={presentationOptions}
            selected={curPresentation}
            onChange={(v) => dispatch({ type: "selectPresentation", value: v })}
          />
        </StepBlock>
      )}

      {/* Step 4 — Quantity */}
      {step === 4 && (
        <StepBlock
          number={4}
          label={t.step5Label}
          active={true}
          summary={null}
          onEdit={() => {}}
          backLabel={t.back}
        >
          <ChipSelector
            options={quantityOptions}
            selected={showCustomQty ? CUSTOM_QTY : null}
            onChange={handleQtySelect}
          />
          {isPack120gSelection && (
            <p className="mt-2 text-xs text-text-muted">
              {t.presentation120gPackNote}
            </p>
          )}
          {showCustomQty && (
            <div className="mt-3 flex gap-2">
              <input
                type="number" min={1} max={9999}
                value={customQty}
                onChange={(e) => dispatch({ type: "setCustomQty", value: e.target.value })}
                placeholder={t.customQtyPlaceholder}
                aria-label={t.customQtyLabel}
                className="w-32 rounded-lg border border-border-mid px-3 py-2 text-sm bg-surface-page focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && confirmCustomQty()}
              />
              <button
                type="button"
                onClick={confirmCustomQty}
                disabled={!customQty || parseInt(customQty) <= 0}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 min-h-[44px]"
              >
                Confirmar
              </button>
            </div>
          )}
        </StepBlock>
      )}

      {/* Back-to-cart link when cart already has items */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => dispatch({ type: "cancelToCart" })}
          className="text-sm text-text-muted underline underline-offset-2 hover:text-text-main transition-colors"
        >
          {t.cancelToCart} ({items.length})
        </button>
      )}
    </>
  )
}
