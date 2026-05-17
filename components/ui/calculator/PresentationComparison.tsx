"use client"

import { m } from "framer-motion"
import type { Dictionary } from "@/lib/i18n"
import {
  packsNeeded,
  cupsPerPack,
  totalCupsFromPacks,
  freshComparison,
  type FruitKey,
  type Presentation,
  type PrepType,
} from "@/lib/yield-calculator"
import { AnimatedNumber, AnimatedFloat } from "./AnimatedNumber"
import { AnimatedCup } from "./AnimatedCup"
import { FRUIT_CUP_COLORS } from "./constants"

type YDict = Dictionary["yieldCalculator"]

const ALL_PRESENTATIONS: Presentation[] = ["120g", "300g", "1000g"]
const MAX_MINI_CUPS = 36

export function PresentationComparison({
  targetCups,
  prep,
  fruit,
  onSelect,
  t,
}: {
  targetCups: number
  prep: PrepType
  fruit: FruitKey
  onSelect: (value: Presentation) => void
  t: YDict
}) {
  const color = FRUIT_CUP_COLORS[fruit]

  const cards = ALL_PRESENTATIONS.map((pres) => {
    const packs = packsNeeded(targetCups, pres, prep)
    const cpp   = cupsPerPack(pres, prep)
    const total = totalCupsFromPacks(packs, pres, prep)
    const extra = total - targetCups
    const fc    = freshComparison(packs, pres, fruit)
    return { pres, packs, cpp, total, extra, fc }
  })

  const maxCpp = Math.max(...cards.map((c) => c.cpp))

  return (
    <div className="space-y-4">
      {cards.map(({ pres, packs, cpp, total, extra, fc }, cardIdx) => {
        const isBest   = cpp === maxCpp
        const visible  = Math.min(total, MAX_MINI_CUPS)
        const overflow = total - visible
        const timeValue = fc.minutesSaved >= 60
          ? Math.round(fc.minutesSaved / 60)
          : fc.minutesSaved

        return (
          <m.button
            key={pres}
            type="button"
            onClick={() => onSelect(pres)}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: cardIdx * 0.14, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.005, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.985 }}
            className={`relative w-full text-left rounded-2xl border-2 p-6 transition-colors cursor-pointer ${
              isBest
                ? "border-primary/40 bg-primary/4 dark:bg-primary/10 shadow-sm shadow-primary/10"
                : "border-border-mid bg-white dark:bg-surface-card hover:border-primary/25"
            }`}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl font-black text-text-main tracking-tight">{pres}</span>
                {isBest && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white uppercase tracking-widest bg-primary px-2.5 py-1 rounded-full shadow-sm shadow-primary/40">
                    {t.bestYield}
                  </span>
                )}
              </div>
              {extra === 0 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/60 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  {t.noSurplus}
                </span>
              ) : (
                <span className="inline-flex items-center bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/60 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  {t.surplusLabel.replace("{n}", String(extra))}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4 pb-5 mb-5 border-b border-border-soft">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  {t.packetsMetric}
                </p>
                <AnimatedNumber
                  target={packs}
                  className="text-5xl font-black text-primary tabular-nums leading-none"
                />
                <p className="text-xs font-semibold text-primary/70 mt-1">
                  {pres} {t.eachUnit}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  {t.cupsMetric}
                </p>
                <AnimatedNumber
                  target={total}
                  className="text-5xl font-black text-text-main tabular-nums leading-none"
                />
                <p className="text-xs font-semibold text-text-muted mt-1">{t.totalCupsLabel}</p>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  {t.freshEquivMetric}
                </p>
                <div className="flex items-baseline gap-1 leading-none">
                  <AnimatedFloat
                    target={fc.freshKg}
                    className="text-5xl font-black text-amber-500 tabular-nums leading-none"
                  />
                  <span className="text-xl font-black text-amber-400">kg</span>
                </div>
                <p className="text-xs font-semibold text-amber-500/80 mt-1">{t.wouldHaveNeeded}</p>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  {t.timeSavedMetric}
                </p>
                <div className="flex items-baseline gap-1 leading-none">
                  <AnimatedNumber
                    target={timeValue}
                    className="text-5xl font-black text-sky-500 tabular-nums leading-none"
                  />
                  <span className="text-xl font-black text-sky-400">
                    {fc.minutesSaved >= 60 ? "h" : "min"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-sky-500/80 mt-1">
                  {fc.minutesSaved >= 60 ? t.hoursSaved : t.minSaved}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 items-end">
              {Array.from({ length: visible }).map((_, j) => (
                <AnimatedCup
                  key={j}
                  color={color}
                  delay={cardIdx * 0.14 + j * 0.025}
                  index={cardIdx * 1000 + j}
                  cupWidth={14}
                  cupHeight={20}
                />
              ))}
              {overflow > 0 && (
                <m.span
                  className="text-xs font-bold text-text-muted self-center ml-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: cardIdx * 0.14 + visible * 0.025 + 0.2, duration: 0.3 }}
                >
                  +{overflow}
                </m.span>
              )}
            </div>
          </m.button>
        )
      })}
    </div>
  )
}
