"use client"

import { m } from "framer-motion"
import type { Dictionary } from "@/lib/i18n"
import type { FruitKey } from "@/lib/yield-calculator"
import { AnimatedCup } from "./AnimatedCup"
import { FRUIT_CUP_COLORS } from "./constants"

type YDict = Dictionary["yieldCalculator"]

const MAX_VISIBLE_CUPS = 20

export function CupGrid({ totalCups, fruit, t }: { totalCups: number; fruit: FruitKey; t: YDict }) {
  const color = FRUIT_CUP_COLORS[fruit]
  const visible = Math.min(totalCups, MAX_VISIBLE_CUPS)
  const overflow = totalCups - visible

  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        {t.cupGridTitle}
      </p>
      <div className="flex flex-wrap gap-2 items-end mb-2">
        {Array.from({ length: visible }).map((_, i) => (
          <AnimatedCup key={i} color={color} delay={i * 0.045} index={i} />
        ))}
        {overflow > 0 && (
          <m.span
            className="text-sm font-semibold text-text-muted self-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: visible * 0.045 + 0.3, duration: 0.4 }}
          >
            +{overflow}
          </m.span>
        )}
      </div>
      <p className="text-xs text-text-muted">
        {t.cupsPerCycle.replace("{n}", String(totalCups))}
      </p>
    </div>
  )
}
