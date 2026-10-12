import {
  FRUIT_DATA,
  freshComparison,
  packsNeeded,
  type FruitKey,
  type PrepType,
  type Presentation,
} from "@/lib/yield-calculator"
import type { Dictionary } from "@/lib/i18n"

type CalculatorText = Dictionary["yieldCalculator"]

/** Wizard step of the interactive yield calculator. */
export type Step = 1 | 2 | 3 | "result"

/**
 * Packs required for the current selection.
 * Returns `null` until target cups, presentation and preparation are all set.
 * The truthiness guards mirror the original inline derivation exactly.
 */
export function packsForResult(
  targetCups: number | null,
  presentation: Presentation | null,
  prep: PrepType | null,
): number | null {
  return targetCups && presentation && prep
    ? packsNeeded(targetCups, presentation, prep)
    : null
}

/**
 * Fresh-fruit comparison for the result screen.
 * Returns `null` until packs, presentation and fruit are all set.
 */
export function freshComparisonForResult(
  packs: number | null,
  presentation: Presentation | null,
  fruit: FruitKey | null,
) {
  return packs && presentation && fruit
    ? freshComparison(packs, presentation, fruit)
    : null
}

/** Prep label used in the completed step summary. */
export function prepSummaryLabel(selectedPrep: PrepType | null, t: CalculatorText): string {
  return selectedPrep === "jugo" ? t.prepJugo : t.prepFrappe
}

/** Fruit label used in the completed step summary; empty until a fruit is picked. */
export function fruitDisplayLabel(fruit: FruitKey | null): string {
  return fruit ? FRUIT_DATA[fruit].label : ""
}

/** Singular or plural pack label for the result hero. */
export function packCountLabel(packs: number, t: CalculatorText): string {
  return packs === 1 ? t.pack : t.packs
}
