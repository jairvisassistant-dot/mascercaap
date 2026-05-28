"use client"

import ChipSelector from "@/components/ui/ChipSelector"
import type { Action } from "./types"
import StepBlock from "./StepBlock"

type Props = {
  step: number | string
  curProductType: string | null
  productOptions: { value: string; label: string }[]
  productTypeLabels: Record<string, string>
  backLabel: string
  stepLabel: string
  dispatch: React.Dispatch<Action>
}

import React from "react"

export default function OrderStep1({
  step, curProductType, productOptions, productTypeLabels, backLabel, stepLabel, dispatch,
}: Props) {
  return (
    <StepBlock
      number={1}
      label={stepLabel}
      active={step === 1}
      summary={curProductType ? (productTypeLabels[curProductType] ?? curProductType) : null}
      onEdit={() => dispatch({ type: "editStep1" })}
      backLabel={backLabel}
    >
      <ChipSelector
        options={productOptions}
        selected={curProductType}
        onChange={(v) => dispatch({ type: "selectProductType", value: v })}
      />
    </StepBlock>
  )
}
