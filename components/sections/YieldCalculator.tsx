"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { m, AnimatePresence, useInView, useReducedMotion } from "framer-motion"
import ChipSelector from "@/components/ui/ChipSelector"
import {
  packsNeeded,
  totalCupsFromPacks,
  freshComparison,
  FRUIT_DATA,
  CUP_OPTIONS,
  type FruitKey,
  type Presentation,
  type PrepType,
} from "@/lib/yield-calculator"
import { useHelpHub } from "@/lib/help-hub-context"
import type { Dictionary } from "@/lib/i18n"
import { AnimatedNumber } from "@/components/ui/calculator/AnimatedNumber"
import { CupGrid } from "@/components/ui/calculator/CupGrid"
import { PreparationTimeline } from "@/components/ui/calculator/PreparationTimeline"
import { PresentationComparison } from "@/components/ui/calculator/PresentationComparison"

type Step = 1 | 2 | 3 | "result"

const FRUIT_OPTIONS_ROW1 = (
  ["mora", "fresa", "lulo", "mango", "guayaba"] as FruitKey[]
).map((k) => ({ value: k, label: FRUIT_DATA[k].label }))

const FRUIT_OPTIONS_ROW2 = (
  ["maracuya", "frutos_rojos", "guanabana", "tomate_arbol"] as FruitKey[]
).map((k) => ({ value: k, label: FRUIT_DATA[k].label }))

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

export default function YieldCalculator({ dict }: { dict: Dictionary }) {
  const t = dict.yieldCalculator
  const { openDrawer } = useHelpHub()

  const PREP_OPTIONS: { value: PrepType; label: string }[] = [
    { value: "jugo",   label: t.prepJugo },
    { value: "frappe", label: t.prepFrappe },
  ]

  const [step, setStep] = useState<Step>(1)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const visualInView = useInView(visualRef, { once: true, amount: 0.35 })
  const shouldReduce = useReducedMotion()

  const [selectedPrep, setSelectedPrep] = useState<PrepType | null>(null)
  const [targetCups, setTargetCups] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customCups, setCustomCups] = useState("")
  const [selectedFruit, setSelectedFruit] = useState<FruitKey | null>(null)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)

  const cupChipOptions = [
    ...CUP_OPTIONS.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_VALUE, label: t.customLabel },
  ]

  function advanceStep1IfReady(prep: PrepType | null, cups: number | null) {
    if (prep !== null && cups !== null) setStep(2)
  }

  function handlePrepSelect(value: PrepType) {
    setSelectedPrep(value)
    advanceStep1IfReady(value, targetCups)
  }

  function handleCupsSelect(value: number) {
    if (value === CUSTOM_VALUE) {
      setShowCustomInput(true)
      setTargetCups(null)
    } else {
      setShowCustomInput(false)
      setCustomCups("")
      setTargetCups(value)
      advanceStep1IfReady(selectedPrep, value)
    }
  }

  function handleCustomCupsConfirm() {
    const parsed = parseInt(customCups, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setTargetCups(parsed)
      setShowCustomInput(false)
      advanceStep1IfReady(selectedPrep, parsed)
    }
  }

  const scrollCard = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 50)
  }, [])

  function handleFruitSelect(value: FruitKey) {
    setSelectedFruit(value)
    setStep(3)
    scrollCard()
  }

  function handlePresentationSelect(value: Presentation) {
    setSelectedPresentation(value)
    setStep("result")
    scrollCard()
  }

  function handleReset() {
    setStep(1)
    setSelectedPrep(null)
    setTargetCups(null)
    setShowCustomInput(false)
    setCustomCups("")
    setSelectedFruit(null)
    setSelectedPresentation(null)
  }

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  function handleBackToStep1() {
    setStep(1)
    setSelectedPrep(null)
    setTargetCups(null)
    setShowCustomInput(false)
    setCustomCups("")
    setSelectedFruit(null)
    setSelectedPresentation(null)
  }
  function handleBackToStep2() { setStep(2); setSelectedFruit(null); setSelectedPresentation(null) }
  function handleBackToStep3() { setStep(3); setSelectedPresentation(null) }

  const packs = targetCups && selectedPresentation && selectedPrep
    ? packsNeeded(targetCups, selectedPresentation, selectedPrep)
    : null

  const comparison = packs && selectedPresentation && selectedFruit
    ? freshComparison(packs, selectedPresentation, selectedFruit)
    : null

  const isCompleted = step !== 1

  return (
    <section className="relative overflow-hidden border-y border-border-mid py-24 bg-[radial-gradient(circle_at_10%_18%,rgba(63,143,70,0.14)_0%,transparent_30%),radial-gradient(circle_at_92%_6%,rgba(229,138,34,0.12)_0%,transparent_28%),linear-gradient(180deg,#f8fbf7_0%,#f4f8f2_52%,#f9fbf8_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(51,83,56,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,83,56,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute left-0 top-14 h-px w-28 bg-primary/35" />

      <div className="relative max-w-6xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-primary/45 rounded-full" />
              <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
                {t.sectionLabel}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.03em] text-text-main mb-4 text-balance">
              {t.title}
            </h2>
            <p className="max-w-[62ch] text-text-muted leading-relaxed text-pretty">{t.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-white/70 p-5 shadow-[0_22px_55px_-36px_rgba(43,92,49,0.48)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-3">{t.quickFlowLabel}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">1. {t.prepLabel}</span>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">2. {t.step2Label}</span>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">3. {t.step3Label}</span>
            </div>
          </div>
        </m.div>

        <div ref={visualRef} className="group relative">
          {/* ── Decorative ambient glows — all respect prefers-reduced-motion ── */}
          <m.div
            className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-[1.9rem] bg-[radial-gradient(circle_at_50%_50%,rgba(63,143,70,0.24)_0%,rgba(63,143,70,0.12)_34%,rgba(63,143,70,0.02)_64%,transparent_82%)] blur-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={visualInView ? (shouldReduce ? { opacity: 0.26, scale: 1 } : { opacity: [0.18, 0.34, 0.18], scale: [0.98, 1.03, 0.98] }) : { opacity: 0, scale: 0.9 }}
            transition={shouldReduce ? {} : { duration: 6.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <m.div
            className="pointer-events-none absolute -inset-1.5 rounded-[1.12rem]"
            initial={{ opacity: 0, rotate: 0 }}
            animate={
              visualInView
                ? (shouldReduce ? { opacity: 0.3, rotate: 0 } : { opacity: [0.3, 0.64, 0.3], rotate: 360 })
                : { opacity: 0, rotate: 0 }
            }
            transition={shouldReduce ? {} : {
              opacity: { duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
              rotate: { duration: 9.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            }}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(63,143,70,0) 0deg, rgba(63,143,70,0) 44deg, rgba(171,224,130,0.62) 70deg, rgba(227,255,207,0.95) 92deg, rgba(145,205,99,0.55) 112deg, rgba(63,143,70,0) 146deg, rgba(63,143,70,0) 360deg)",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              padding: "2.2px",
              filter: "drop-shadow(0 0 8px rgba(171,224,130,0.45)) drop-shadow(0 0 16px rgba(145,205,99,0.28))",
            }}
          />
          <m.div
            className="pointer-events-none absolute -inset-x-2 -inset-y-2 rounded-[1.6rem] opacity-85 [background-image:linear-gradient(to_right,rgba(63,143,70,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,143,70,0.12)_1px,transparent_1px)] [background-size:22px_22px]"
            initial={{ opacity: 0 }}
            animate={visualInView ? (shouldReduce ? { opacity: 0.7 } : { opacity: [0.56, 0.85, 0.56], backgroundPosition: ["0px 0px", "22px 11px", "0px 0px"] }) : { opacity: 0 }}
            transition={shouldReduce ? {} : { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <m.div
            className="pointer-events-none absolute -inset-x-8 -bottom-12 h-28 rounded-full bg-primary/30 blur-3xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={
              visualInView
                ? (shouldReduce ? { opacity: 0.29, scale: 1 } : { opacity: [0.2, 0.38, 0.2], scale: [0.96, 1.06, 0.96] })
                : { opacity: 0, scale: 0.92 }
            }
            transition={shouldReduce ? {} : { duration: 5.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />

          <m.div
            initial={{ opacity: 0, y: 12, scale: 0.992 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/30" />
            <m.div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.2 }}
            >
              <m.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={visualInView ? (shouldReduce ? { opacity: 0.4 } : { opacity: [0.25, 0.55, 0.25] }) : { opacity: 0 }}
                transition={shouldReduce ? {} : { duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(63,143,70,0.0) 74deg, rgba(63,143,70,0.58) 110deg, rgba(255,255,255,0.7) 128deg, rgba(63,143,70,0.0) 170deg, transparent 360deg)",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1.5px",
                }}
              />
              <m.div
                className="absolute -left-1/4 top-0 h-full w-1/4 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.02)_15%,rgba(63,143,70,0.30)_50%,rgba(255,255,255,0.02)_85%,transparent_100%)]"
                initial={{ x: "-120%", opacity: 0 }}
                whileInView={{ x: "520%", opacity: [0, 1, 0] }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
              <m.div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c6f59f] to-transparent"
                initial={{ opacity: 0.2 }}
                animate={visualInView ? (shouldReduce ? { opacity: 0.5 } : { opacity: [0.15, 0.85, 0.15] }) : { opacity: 0.2 }}
                transition={shouldReduce ? {} : { duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            </m.div>

            <div ref={cardRef} className="relative rounded-[1.4rem] border border-primary/20 bg-white/86 p-6 shadow-[0_30px_80px_-44px_rgba(31,74,39,0.6)] backdrop-blur-md md:p-8">

              {/* Step 1 — prep type + cup count */}
              <div className={isCompleted ? "mb-6 pb-6 border-b border-border-mid" : ""}>
                {step === 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                      <p className="text-sm font-semibold text-text-main mb-3">
                        <span className="text-primary mr-2">1.</span>{t.prepLabel}
                      </p>
                      <ChipSelector
                        options={PREP_OPTIONS}
                        selected={selectedPrep}
                        onChange={handlePrepSelect}
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
                            onChange={(e) => setCustomCups(e.target.value)}
                            placeholder={t.customPlaceholder}
                            className="w-40 rounded-lg border border-border-mid px-3 py-2 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary"
                            onKeyDown={(e) => e.key === "Enter" && handleCustomCupsConfirm()}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleCustomCupsConfirm}
                            disabled={!customCups || parseInt(customCups, 10) <= 0}
                            className="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-text-main flex flex-wrap items-center">
                    <span className="text-primary mr-2">1.</span>
                    <span className="text-text-muted font-normal">
                      {selectedPrep === "jugo" ? t.prepJugo : t.prepFrappe} — {targetCups} {t.cups}
                    </span>
                    <BackLink label={t.back} onClick={handleBackToStep1} />
                  </p>
                )}
              </div>

              {/* Step 2 — fruit selection */}
              {(step === 2 || step === 3 || step === "result") && (
                <div className={step !== 2 ? "mb-6 pb-6 border-b border-border-mid" : ""}>
                  <p className="text-sm font-semibold text-text-main mb-3">
                    <span className="text-primary mr-2">2.</span>{t.step2Label}
                  </p>
                  {step === 2 ? (
                    <div className="space-y-3">
                      <ChipSelector
                        options={FRUIT_OPTIONS_ROW1}
                        selected={selectedFruit}
                        onChange={handleFruitSelect}
                        className="flex flex-wrap gap-3"
                      />
                      <ChipSelector
                        options={FRUIT_OPTIONS_ROW2}
                        selected={selectedFruit}
                        onChange={handleFruitSelect}
                        className="flex flex-wrap gap-3"
                      />
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm flex flex-wrap items-center">
                      <span>{selectedFruit ? FRUIT_DATA[selectedFruit].label : ""}</span>
                      <BackLink label={t.back} onClick={handleBackToStep2} />
                    </p>
                  )}
                </div>
              )}

              {/* Step 3 — presentation comparison */}
              {(step === 3 || step === "result") && targetCups && selectedPrep && selectedFruit && (
                <div className={step !== 3 ? "mb-6 pb-6 border-b border-border-mid" : ""}>
                  <p className="text-sm font-semibold text-text-main mb-4">
                    <span className="text-primary mr-2">3.</span>{t.step3Label}
                  </p>
                  {step === 3 ? (
                    <PresentationComparison
                      targetCups={targetCups}
                      prep={selectedPrep}
                      fruit={selectedFruit}
                      onSelect={handlePresentationSelect}
                      t={t}
                    />
                  ) : (
                    <p className="text-text-muted text-sm flex flex-wrap items-center">
                      <span>{selectedPresentation}</span>
                      <BackLink label={t.back} onClick={handleBackToStep3} />
                    </p>
                  )}
                </div>
              )}

              {/* Result */}
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
                            {packs === 1 ? t.pack : t.packs}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted">
                          de {FRUIT_DATA[selectedFruit].label} {selectedPresentation}
                        </p>
                      </div>

                      <div className="px-5 py-5 border-b border-primary/10">
                        <CupGrid
                          totalCups={totalCupsFromPacks(packs, selectedPresentation, selectedPrep)}
                          fruit={selectedFruit}
                          t={t}
                        />
                      </div>

                      <div className="px-5 py-5">
                        <PreparationTimeline minutesSaved={comparison.minutesSaved} t={t} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                      {packs && (
                        <button
                          type="button"
                          onClick={() => openDrawer("order")}
                          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px]"
                        >
                          {t.ctaWhatsapp}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center justify-center min-h-[44px] px-4 text-sm text-text-muted underline underline-offset-2 hover:text-text-main transition-colors"
                      >
                        {t.calcAgain}
                      </button>
                    </div>

                    <p className="mt-4 text-xs text-text-muted/70 italic">{t.disclaimer}</p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}
