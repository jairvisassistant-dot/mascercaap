"use client"

import { useState, useEffect } from "react"
import { m, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion"
import ChipSelector from "@/components/ui/ChipSelector"
import {
  cupsPerPack,
  packsNeeded,
  freshComparison,
  buildWhatsappMessage,
  FRUIT_DATA,
  CUP_OPTIONS,
  type FruitKey,
  type Presentation,
  type PrepType,
} from "@/lib/yield-calculator"
import { SITE_CONFIG } from "@/lib/config"
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
  pina:         "#fde047",
  tomate_arbol: "#f97316",
}

const FRUIT_OPTIONS = (Object.keys(FRUIT_DATA) as FruitKey[]).map((key) => ({
  value: key,
  label: FRUIT_DATA[key].label,
}))

const CUSTOM_VALUE = -1

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""))
}

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

  const PREP_OPTIONS: { value: PrepType; label: string }[] = [
    { value: "jugo",   label: t.prepJugo },
    { value: "frappe", label: t.prepFrappe },
  ]

  const [step, setStep] = useState<Step>(1)
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

  function handleFruitSelect(value: FruitKey) {
    setSelectedFruit(value)
    setStep(3)
  }

  function handlePresentationSelect(value: Presentation) {
    setSelectedPresentation(value)
    setStep("result")
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

  const whatsappUrl = packs && selectedPresentation && selectedFruit && targetCups && selectedPrep
    ? buildWhatsappMessage({
        fruit: selectedFruit,
        presentation: selectedPresentation,
        targetCups,
        packsCount: packs,
        whatsappNumber: SITE_CONFIG.whatsappNumber,
        prepType: selectedPrep,
      })
    : null

  const isCompleted = step !== 1

  return (
    <section className="py-24 bg-surface-page border-y border-border-mid">
      <div className="max-w-4xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-primary/40 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
              {t.sectionLabel}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-3">
            {t.title}
          </h2>
          <p className="text-text-muted leading-relaxed">{t.subtitle}</p>
        </m.div>

        <div className="bg-white dark:bg-surface-card rounded-2xl border border-border-mid shadow-sm p-6 md:p-8">

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
                <ChipSelector
                  options={FRUIT_OPTIONS}
                  selected={selectedFruit}
                  onChange={handleFruitSelect}
                />
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
                      Para {targetCups} vasos de 12oz necesitás
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
                      totalCups={cupsPerPack(selectedPresentation, selectedPrep) * packs}
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
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px]"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.857L0 24l6.335-1.518A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.092-1.424l-.366-.217-3.762.902.944-3.653-.238-.374A9.776 9.776 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
                      </svg>
                      {interpolate(t.ctaWhatsapp, { count: packs })}
                    </a>
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
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────
// Paso 3 — Tarjetas comparativas animadas (una por presentación)
// ─────────────────────────────────────────────────────────────────
const ALL_PRESENTATIONS: Presentation[] = ["120g", "300g", "1000g"]
const MAX_MINI_CUPS = 32

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
    const total = cpp * packs
    const extra = total - targetCups
    return { pres, packs, cpp, total, extra }
  })

  const maxCpp = Math.max(...cards.map((c) => c.cpp))

  return (
    <div className="space-y-3">
      {cards.map(({ pres, packs, cpp, total, extra }, cardIdx) => {
        const isBest  = cpp === maxCpp
        const visible = Math.min(total, MAX_MINI_CUPS)
        const overflow = total - visible

        return (
          <m.button
            key={pres}
            type="button"
            onClick={() => onSelect(pres)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: cardIdx * 0.13, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.975 }}
            className={`relative w-full text-left rounded-xl border p-5 transition-colors cursor-pointer ${
              isBest
                ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                : "border-border-mid bg-white dark:bg-surface-card hover:border-primary/30"
            }`}
          >
            {/* Shimmer al hacer clic — Idea 5 */}
            <AnimatePresence>
              <m.span
                key={`shimmer-${pres}`}
                className="absolute inset-0 rounded-xl pointer-events-none"
                initial={false}
              />
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-text-main">{pres}</span>
                {isBest && (
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Mayor rendimiento
                  </span>
                )}
              </div>
              {extra === 0 ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                  ✓ Sin excedente
                </span>
              ) : (
                <span className="inline-flex items-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                  +{extra} vasos extra
                </span>
              )}
            </div>

            {/* Odómetro paquetes (izq) + vasos animados (der) — Idea 1 */}
            <div className="flex items-end justify-between gap-4 mb-4">
              <div className="flex items-baseline gap-1.5">
                <AnimatedNumber
                  target={packs}
                  className="text-5xl font-bold text-primary tabular-nums leading-none"
                />
                <span className="text-base text-text-muted">{packs === 1 ? "paquete" : "paquetes"}</span>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <AnimatedNumber
                    target={total}
                    className="text-3xl font-bold text-text-main tabular-nums leading-none"
                  />
                  <span className="text-sm font-medium text-text-muted">vasos</span>
                </div>
                <p className="text-xs text-text-muted/60 mt-0.5">de 12oz</p>
              </div>
            </div>

            {/* Vasos que se llenan — Idea 3 */}
            <div className="flex flex-wrap gap-1.5 items-end">
              {Array.from({ length: visible }).map((_, j) => (
                <AnimatedCup
                  key={j}
                  color={color}
                  delay={cardIdx * 0.13 + j * 0.03}
                  index={cardIdx * 1000 + j}
                  cupWidth={14}
                  cupHeight={20}
                />
              ))}
              {overflow > 0 && (
                <m.span
                  className="text-xs font-semibold text-text-muted self-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: cardIdx * 0.13 + visible * 0.03 + 0.25, duration: 0.3 }}
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
// Idea 1 — Odómetro animado
// ─────────────────────────────────────────────────────────────────
function AnimatedNumber({ target, className }: { target: number; className?: string }) {
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(mv, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [target])

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
        ~{totalCups} vasos de 12oz por cada ciclo de preparación
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
