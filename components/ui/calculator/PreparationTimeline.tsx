"use client"

import { m } from "framer-motion"
import type { Dictionary } from "@/lib/i18n"

type YDict = Dictionary["yieldCalculator"]

function formatTime(min: number): string {
  if (min >= 60) return `~${Math.round(min / 60)}h`
  return `~${min} min`
}

export function PreparationTimeline({ minutesSaved, t }: { minutesSaved: number; t: YDict }) {
  const pulpaMin = 5
  const freshMin = minutesSaved + pulpaMin
  const pulpaPct = Math.max(5, (pulpaMin / freshMin) * 80)

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        {t.comparisonTitle}
      </p>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">{t.freshFruitLabel}</span>
          <span className="text-amber-600 font-semibold">{formatTime(freshMin)}</span>
        </div>
        <div className="h-2.5 bg-white/60 rounded-full overflow-hidden border border-border-soft">
          <m.div
            className="h-full rounded-full bg-amber-400"
            initial={{ width: "0%" }}
            animate={{ width: "80%" }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">{t.masApLabel}</span>
          <span className="text-primary font-semibold">{formatTime(pulpaMin)}</span>
        </div>
        <div className="h-2.5 bg-white/60 rounded-full overflow-hidden border border-border-soft">
          <m.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${pulpaPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.85 }}
          />
        </div>
      </div>

      <m.p
        className="text-sm font-semibold text-primary"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.4 }}
      >
        {t.timeSavedResult.replace("{t}", formatTime(minutesSaved))}
      </m.p>
    </div>
  )
}
