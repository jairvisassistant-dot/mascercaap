"use client"

import { AnimatePresence, m } from "framer-motion"
import ChipSelector from "@/components/ui/ChipSelector"
import {
  totalCupsFromPacks,
  FRUIT_DATA,
  type FruitKey,
  type Presentation,
  type PrepType,
} from "@/lib/yield-calculator"
import { AnimatedNumber } from "@/components/ui/calculator/AnimatedNumber"
import { CupGrid } from "@/components/ui/calculator/CupGrid"
import { PreparationTimeline } from "@/components/ui/calculator/PreparationTimeline"
import { PresentationComparison } from "@/components/ui/calculator/PresentationComparison"
import type { Dictionary } from "@/lib/i18n"
import {
  type Step,
  freshComparisonForResult,
  fruitDisplayLabel,
  packCountLabel,
  packsForResult,
  prepSummaryLabel,
} from "./calculator-view-model"

export type CalcState = {
  step: Step;
  selectedPrep: PrepType | null;
  targetCups: number | null;
  showCustomInput: boolean;
  customCups: string;
  selectedFruit: FruitKey | null;
  selectedPresentation: Presentation | null;
};

export type CalcAction =
  | { type: "selectPrep"; prep: PrepType }
  | { type: "selectCups"; cups: number }
  | { type: "showCustom" }
  | { type: "setCustomCups"; value: string }
  | { type: "confirmCustomCups"; cups: number }
  | { type: "selectFruit"; fruit: FruitKey }
  | { type: "selectPresentation"; presentation: Presentation }
  | { type: "backToStep1" }
  | { type: "backToStep2" }
  | { type: "backToStep3" }
  | { type: "reset" };

const CUSTOM_VALUE = -1

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-3 inline-flex items-center justify-center min-h-[36px] px-2 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
    >
      {label}
    </button>
  )
}

interface CalculatorInteractiveProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  prepOptions: { value: PrepType; label: string }[];
  cupChipOptions: { value: number; label: string }[];
  t: Dictionary["yieldCalculator"];
  onFruitSelect: (fruit: FruitKey) => void;
  onPresentationSelect: (presentation: Presentation) => void;
  onOrder: () => void;
}

export function CalculatorInteractive({
  cardRef,
  state,
  dispatch,
  prepOptions,
  cupChipOptions,
  t,
  onFruitSelect,
  onPresentationSelect,
  onOrder,
}: CalculatorInteractiveProps) {
  const { targetCups, selectedPresentation, selectedPrep, selectedFruit } = state;

  const packs = packsForResult(targetCups, selectedPresentation, selectedPrep);
  const comparison = freshComparisonForResult(packs, selectedPresentation, selectedFruit);

  return (
    <div ref={cardRef} className="relative rounded-[1.4rem] border border-primary/20 bg-white/86 p-6 shadow-[0_30px_80px_-44px_rgba(31,74,39,0.6)] backdrop-blur-md md:p-8">

      {/* Step 1 — prep type + cup count */}
      <StepPrepSection
        state={state}
        dispatch={dispatch}
        prepOptions={prepOptions}
        cupChipOptions={cupChipOptions}
        t={t}
      />

      {/* Step 2 — fruit selection */}
      <StepFruitSection state={state} dispatch={dispatch} t={t} onFruitSelect={onFruitSelect} />

      {/* Step 3 — presentation comparison */}
      <StepPresentationSection
        state={state}
        dispatch={dispatch}
        t={t}
        onPresentationSelect={onPresentationSelect}
      />

      {/* Result */}
      <ResultSection
        state={state}
        packs={packs}
        comparison={comparison}
        dispatch={dispatch}
        t={t}
        onOrder={onOrder}
      />
    </div>
  )
}

function StepPrepSection({
  state,
  dispatch,
  prepOptions,
  cupChipOptions,
  t,
}: {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  prepOptions: { value: PrepType; label: string }[];
  cupChipOptions: { value: number; label: string }[];
  t: Dictionary["yieldCalculator"];
}) {
  const { step, selectedPrep, targetCups, showCustomInput, customCups } = state;

  function handleCustomCupsConfirm() {
    const parsed = parseInt(customCups, 10)
    if (!isNaN(parsed) && parsed > 0) {
      dispatch({ type: "confirmCustomCups", cups: parsed });
    }
  }

  function handleCupsSelect(value: number) {
    if (value === CUSTOM_VALUE) {
      dispatch({ type: "showCustom" });
    } else {
      dispatch({ type: "selectCups", cups: value });
    }
  }

  return (
    <div className={step !== 1 ? "mb-6 pb-6 border-b border-border-mid" : ""}>
      {step === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <p className="text-sm font-semibold text-text-main mb-3">
              <span className="text-primary mr-2">1.</span>{t.prepLabel}
            </p>
            <ChipSelector
              options={prepOptions}
              selected={selectedPrep}
              onChange={(value) => dispatch({ type: "selectPrep", prep: value })}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-main mb-3">
              {t.step1Label}
            </p>
            <ChipSelector
              options={cupChipOptions}
              selected={showCustomInput ? CUSTOM_VALUE : targetCups}
              onChange={handleCupsSelect}
            />
            {showCustomInput && (
              <div className="mt-3 flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={customCups}
                  onChange={(e) => dispatch({ type: "setCustomCups", value: e.target.value })}
                  placeholder={t.customPlaceholder}
                  aria-label={t.customPlaceholder}
                  className="w-40 rounded-lg border border-border-mid px-3 py-2 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleCustomCupsConfirm()}
                />
                <button
                  type="button"
                  onClick={handleCustomCupsConfirm}
                  disabled={!customCups || parseInt(customCups, 10) <= 0}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold text-text-main flex flex-wrap items-center">
          <span className="text-primary mr-2">1.</span>
          <span className="text-text-muted font-normal">
            {prepSummaryLabel(selectedPrep, t)}: {targetCups} {t.cups}
          </span>
          <BackLink label={t.back} onClick={() => dispatch({ type: "backToStep1" })} />
        </p>
      )}
    </div>
  )
}

function StepFruitSection({
  state,
  dispatch,
  t,
  onFruitSelect,
}: {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  t: Dictionary["yieldCalculator"];
  onFruitSelect: (fruit: FruitKey) => void;
}) {
  const { step, selectedFruit } = state;

  return (
    (step === 2 || step === 3 || step === "result") && (
      <div className={step !== 2 ? "mb-6 pb-6 border-b border-border-mid" : ""}>
        <p className="text-sm font-semibold text-text-main mb-3">
          <span className="text-primary mr-2">2.</span>{t.step2Label}
        </p>
        {step === 2 ? (
          <div className="space-y-3">
            <ChipSelector
              options={FRUIT_OPTIONS_ROW1}
              selected={selectedFruit}
              onChange={onFruitSelect}
              className="flex flex-wrap gap-3"
            />
            <ChipSelector
              options={FRUIT_OPTIONS_ROW2}
              selected={selectedFruit}
              onChange={onFruitSelect}
              className="flex flex-wrap gap-3"
            />
          </div>
        ) : (
          <p className="text-text-muted text-sm flex flex-wrap items-center">
            <span>{fruitDisplayLabel(selectedFruit)}</span>
            <BackLink label={t.back} onClick={() => dispatch({ type: "backToStep2" })} />
          </p>
        )}
      </div>
    )
  )
}

function StepPresentationSection({
  state,
  dispatch,
  t,
  onPresentationSelect,
}: {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  t: Dictionary["yieldCalculator"];
  onPresentationSelect: (presentation: Presentation) => void;
}) {
  const { step, targetCups, selectedPrep, selectedFruit, selectedPresentation } = state;

  return (
    (step === 3 || step === "result") && targetCups && selectedPrep && selectedFruit && (
      <div className={step !== 3 ? "mb-6 pb-6 border-b border-border-mid" : ""}>
        <p className="text-sm font-semibold text-text-main mb-4">
          <span className="text-primary mr-2">3.</span>{t.step3Label}
        </p>
        {step === 3 ? (
          <PresentationComparison
            targetCups={targetCups}
            prep={selectedPrep}
            fruit={selectedFruit}
            onSelect={onPresentationSelect}
            t={t}
          />
        ) : (
          <p className="text-text-muted text-sm flex flex-wrap items-center">
            <span>{selectedPresentation}</span>
            <BackLink label={t.back} onClick={() => dispatch({ type: "backToStep3" })} />
          </p>
        )}
      </div>
    )
  )
}

function ResultSection({
  state,
  packs,
  comparison,
  dispatch,
  t,
  onOrder,
}: {
  state: CalcState;
  packs: number | null;
  comparison: ReturnType<typeof freshComparisonForResult>;
  dispatch: React.Dispatch<CalcAction>;
  t: Dictionary["yieldCalculator"];
  onOrder: () => void;
}) {
  const { step, selectedFruit, selectedPresentation, targetCups, selectedPrep } = state;

  return (
    <AnimatePresence>
      {step === "result" && packs && comparison && selectedFruit && selectedPresentation && targetCups && selectedPrep && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="rounded-xl bg-primary/6 border border-primary/20 overflow-hidden mb-5">
            <div className="px-5 pt-6 pb-5 text-center border-b border-primary/10">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t.resultHeroPrefix.replace("{n}", String(targetCups))}
              </p>
              <div className="flex items-end justify-center gap-2 mb-2">
                <AnimatedNumber
                  target={packs}
                  className="text-6xl font-bold text-primary leading-none tabular-nums"
                />
                <span className="text-xl font-semibold text-text-main pb-1.5">
                  {packCountLabel(packs, t)}
                </span>
              </div>
              <p className="text-sm text-text-muted">
                de {FRUIT_DATA[selectedFruit].label} {selectedPresentation}
              </p>
            </div>

            <div className="p-5 border-b border-primary/10">
              <CupGrid
                totalCups={totalCupsFromPacks(packs, selectedPresentation, selectedPrep)}
                fruit={selectedFruit}
                t={t}
              />
            </div>

            <div className="p-5">
              <PreparationTimeline minutesSaved={comparison.minutesSaved} t={t} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {packs && (
              <button
                type="button"
                onClick={onOrder}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px]"
              >
                {t.ctaWhatsapp}
              </button>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: "reset" })}
              className="inline-flex items-center justify-center min-h-[44px] px-4 text-sm text-text-muted underline underline-offset-2 hover:text-text-main transition-colors"
            >
              {t.calcAgain}
            </button>
          </div>

          <p className="mt-4 text-xs text-text-muted/70 italic">{t.disclaimer}</p>
        </m.div>
      )}
    </AnimatePresence>
  )
}

// Fruit option lists kept here alongside the component that uses them
const FRUIT_OPTIONS_ROW1 = (
  ["mora", "fresa", "lulo", "mango", "guayaba"] as FruitKey[]
).map((k) => ({ value: k, label: FRUIT_DATA[k].label }))

const FRUIT_OPTIONS_ROW2 = (
  ["maracuya", "frutos_rojos", "frutos_amarillos", "guanabana", "tomate_arbol"] as FruitKey[]
).map((k) => ({ value: k, label: FRUIT_DATA[k].label }))
