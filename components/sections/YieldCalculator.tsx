"use client"

import { useState, useEffect, useRef } from "react"
import { m, AnimatePresence, useMotionValue, useTransform, animate, useInView } from "framer-motion"
import ChipSelector from "@/components/ui/ChipSelector"
import {
  cupsPerPack,
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

type Step = 1 | 2 | 3 | "result"

// ── Colores por fruta para los vasos animados ─────────────────────
const FRUIT_CUP_COLORS: Record<FruitKey, string> = {
  maracuya:     "#fb923c",
  mora:         "#a855f7",
  mango:        "#fbbf24",
  lulo:         "#86efac",
  guanabana:    "#6ee7b7",
  fresa:        "#f87171",
  guayaba:      "#fb7185",
  frutos_rojos: "#dc2626",
  tomate_arbol: "#f97316",
}

// Fila 1 — nombres cortos (5 chips)
const FRUIT_OPTIONS_ROW1 = (
  ["mora", "fresa", "lulo", "mango", "guayaba"] as FruitKey[]
).map((k) => ({ value: k, label: FRUIT_DATA[k].label }))

// Fila 2 — nombres más largos (4 chips)
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
  const visualRef = useRef<HTMLDivElement>(null)
  const visualInView = useInView(visualRef, { once: true, amount: 0.35 })

  const [selectedPrep, setSelectedPrep] = useState<PrepType | null>(null)
  const [targetCups, setTargetCups] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customCups, setCustomCups] = useState("")
  const [selectedFruit, setSelectedFruit] = useState<FruitKey | null>(null)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)

  const cupChipOptions = [
    ...CUP_OPTIONS.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_VALUE, label: "Personalizado" },
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

  function scrollCard() {
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 50)
  }

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-3">flujo rapido</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">1. {t.prepLabel}</span>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">2. {t.step2Label}</span>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">3. {t.step3Label}</span>
            </div>
          </div>
        </m.div>

        <div ref={visualRef} className="group relative">
          <m.div
            className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-[1.9rem] bg-[radial-gradient(circle_at_50%_50%,rgba(63,143,70,0.24)_0%,rgba(63,143,70,0.12)_34%,rgba(63,143,70,0.02)_64%,transparent_82%)] blur-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={visualInView ? { opacity: [0.18, 0.34, 0.18], scale: [0.98, 1.03, 0.98] } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 6.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <m.div
            className="pointer-events-none absolute -inset-1.5 rounded-[1.12rem]"
            initial={{ opacity: 0, rotate: 0 }}
            animate={
              visualInView
                ? {
                    opacity: [0.3, 0.64, 0.3],
                    rotate: 360,
                  }
                : { opacity: 0, rotate: 0 }
            }
            transition={{
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
            animate={visualInView ? { opacity: [0.56, 0.85, 0.56], backgroundPosition: ["0px 0px", "22px 11px", "0px 0px"] } : { opacity: 0 }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <m.div
            className="pointer-events-none absolute -inset-x-8 -bottom-12 h-28 rounded-full bg-primary/30 blur-3xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={
              visualInView
                ? {
                    opacity: [0.2, 0.38, 0.2],
                    scale: [0.96, 1.06, 0.96],
                  }
                : { opacity: 0, scale: 0.92 }
            }
            transition={{ duration: 5.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
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
                animate={visualInView ? { opacity: [0.25, 0.55, 0.25] } : { opacity: 0 }}
                transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
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
                animate={visualInView ? { opacity: [0.15, 0.85, 0.15] } : { opacity: 0.2 }}
                transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            </m.div>

        <div ref={cardRef} className="relative rounded-[1.4rem] border border-primary/20 bg-white/86 p-6 shadow-[0_30px_80px_-44px_rgba(31,74,39,0.6)] backdrop-blur-md md:p-8">

          {/* Paso 1 — dos columnas: tipo de preparación + cantidad */}
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
                  {selectedPrep === "jugo" ? t.prepJugo : t.prepFrappe} — {targetCups} vasos
                </span>
                <BackLink label={t.back} onClick={handleBackToStep1} />
              </p>
            )}
          </div>

          {/* Paso 2 */}
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

          {/* Paso 3 — comparativa animada de presentaciones */}
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
                />
              ) : (
                <p className="text-text-muted text-sm flex flex-wrap items-center">
                  <span>{selectedPresentation}</span>
                  <BackLink label={t.back} onClick={handleBackToStep3} />
                </p>
              )}
            </div>
          )}

          {/* ── Resultado animado ─────────────────────────────────── */}
          <AnimatePresence>
            {step === "result" && packs && comparison && selectedFruit && selectedPresentation && targetCups && selectedPrep && (
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="rounded-xl bg-primary/6 border border-primary/20 overflow-hidden mb-5">

                  {/* ── Idea 1: Héroe con odómetro ───────────────── */}
                  <div className="px-5 pt-6 pb-5 text-center border-b border-primary/10">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Para {targetCups} vasos de 16oz necesitas
                    </p>
                    <div className="flex items-end justify-center gap-2 mb-2">
                      <AnimatedNumber
                        target={packs}
                        className="text-6xl font-bold text-primary leading-none tabular-nums"
                      />
                      <span className="text-xl font-semibold text-text-main pb-1.5">
                        {packs === 1 ? "paquete" : "paquetes"}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">
                      de {FRUIT_DATA[selectedFruit].label} {selectedPresentation}
                    </p>
                  </div>

                  {/* ── Idea 3: Vasos que se llenan ──────────────── */}
                  <div className="px-5 py-5 border-b border-primary/10">
                    <CupGrid
                      totalCups={totalCupsFromPacks(packs, selectedPresentation, selectedPrep)}
                      fruit={selectedFruit}
                    />
                  </div>

                  {/* ── Idea 2: Timeline de preparación ─────────── */}
                  <div className="px-5 py-5">
                    <PreparationTimeline minutesSaved={comparison.minutesSaved} />
                  </div>
                </div>

                {/* CTA */}
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
                    Calcular de nuevo
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

// ─────────────────────────────────────────────────────────────────
// Paso 3 — Tarjetas comparativas premium (una por presentación)
// ─────────────────────────────────────────────────────────────────
const ALL_PRESENTATIONS: Presentation[] = ["120g", "300g", "1000g"]
const MAX_MINI_CUPS = 36

function PresentationComparison({
  targetCups,
  prep,
  fruit,
  onSelect,
}: {
  targetCups: number
  prep: PrepType
  fruit: FruitKey
  onSelect: (value: Presentation) => void
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
        const timeUnit  = fc.minutesSaved >= 60 ? "h ahorradas" : "min ahorrados"

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
            {/* ── Encabezado ─────────────────────── */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl font-black text-text-main tracking-tight">{pres}</span>
                {isBest && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white uppercase tracking-widest bg-primary px-2.5 py-1 rounded-full shadow-sm shadow-primary/40">
                    ★ Mayor rendimiento
                  </span>
                )}
              </div>
              {extra === 0 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/60 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  ✓ Sin excedente
                </span>
              ) : (
                <span className="inline-flex items-center bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/60 px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  +{extra} vasos extra
                </span>
              )}
            </div>

            {/* ── 4 métricas ─────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4 pb-5 mb-5 border-b border-border-soft">

              {/* Métrica 1: Paquetes */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  Paquetes
                </p>
                <AnimatedNumber
                  target={packs}
                  className="text-5xl font-black text-primary tabular-nums leading-none"
                />
                <p className="text-xs font-semibold text-primary/70 mt-1">
                  {pres} c/u
                </p>
              </div>

              {/* Métrica 2: Vasos */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  Vasos de 16oz
                </p>
                <AnimatedNumber
                  target={total}
                  className="text-5xl font-black text-text-main tabular-nums leading-none"
                />
                <p className="text-xs font-semibold text-text-muted mt-1">vasos totales</p>
              </div>

              {/* Métrica 3: Fruta fresca equivalente */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  Fruta fresca equiv.
                </p>
                <div className="flex items-baseline gap-1 leading-none">
                  <AnimatedFloat
                    target={fc.freshKg}
                    className="text-5xl font-black text-amber-500 tabular-nums leading-none"
                  />
                  <span className="text-xl font-black text-amber-400">kg</span>
                </div>
                <p className="text-xs font-semibold text-amber-500/80 mt-1">habrías necesitado</p>
              </div>

              {/* Métrica 4: Tiempo ahorrado */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-2">
                  Tiempo ahorrado
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
                <p className="text-xs font-semibold text-sky-500/80 mt-1">{timeUnit}</p>
              </div>
            </div>

            {/* ── Vasos que se llenan — Idea 3 ──── */}
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

// ─────────────────────────────────────────────────────────────────
// Idea 1 — Odómetro animado (enteros)
// ─────────────────────────────────────────────────────────────────
function AnimatedNumber({ target, className }: { target: number; className?: string }) {
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(mv, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [mv, target])

  return <m.span className={className}>{display}</m.span>
}

// Odómetro para decimales (e.g. 1.2 kg)
function AnimatedFloat({ target, className }: { target: number; className?: string }) {
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v) => v.toFixed(1))

  useEffect(() => {
    const controls = animate(mv, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [mv, target])

  return <m.span className={className}>{display}</m.span>
}

// ─────────────────────────────────────────────────────────────────
// Idea 3 — Vasos que se llenan en secuencia
// ─────────────────────────────────────────────────────────────────
const MAX_VISIBLE_CUPS = 20

function CupGrid({ totalCups, fruit }: { totalCups: number; fruit: FruitKey }) {
  const color = FRUIT_CUP_COLORS[fruit]
  const visible = Math.min(totalCups, MAX_VISIBLE_CUPS)
  const overflow = totalCups - visible

  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Rendimiento — vasos que preparás
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
        ~{totalCups} vasos de 16oz por cada ciclo de preparación
      </p>
    </div>
  )
}

function AnimatedCup({
  color,
  delay,
  index,
  cupWidth = 18,
  cupHeight = 26,
}: {
  color: string
  delay: number
  index: number
  cupWidth?: number
  cupHeight?: number
}) {
  const id = `cup-clip-${index}`
  return (
    <m.svg
      viewBox="0 0 18 26"
      width={cupWidth}
      height={cupHeight}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: "easeOut" }}
    >
      <defs>
        <clipPath id={id}>
          <polygon points="2,3 16,3 13,24 5,24" />
        </clipPath>
      </defs>
      <polygon points="2,3 16,3 13,24 5,24" fill="#f3f4f6" />
      <m.rect
        x="-1" y="0" width="20" height="25"
        fill={color}
        fillOpacity={0.8}
        clipPath={`url(#${id})`}
        initial={{ y: 25 }}
        animate={{ y: 2 }}
        transition={{ delay: delay + 0.12, duration: 0.55, ease: [0.32, 0, 0.67, 0] }}
      />
      <polygon points="2,3 16,3 13,24 5,24" fill="none" stroke="#d1d5db" strokeWidth="1" strokeLinejoin="round" />
    </m.svg>
  )
}

// ─────────────────────────────────────────────────────────────────
// Idea 2 — Timeline de preparación animado
// ─────────────────────────────────────────────────────────────────
function formatTime(min: number): string {
  if (min >= 60) return `~${Math.round(min / 60)}h`
  return `~${min} min`
}

function PreparationTimeline({ minutesSaved }: { minutesSaved: number }) {
  const pulpaMin = 5
  const freshMin = minutesSaved + pulpaMin
  const pulpaPct = Math.max(5, (pulpaMin / freshMin) * 80)

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Tiempo de preparación comparado
      </p>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">🍋 Fruta fresca</span>
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
          <span className="text-text-muted">🧊 Pulpa Más Cerca</span>
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
        ⏱ Ahorrás {formatTime(minutesSaved)} de procesamiento por preparación
      </m.p>
    </div>
  )
}
