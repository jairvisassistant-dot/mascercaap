"use client"

import { useState } from "react"
import { m } from "framer-motion"
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
} from "@/lib/yield-calculator"
import { SITE_CONFIG } from "@/lib/config"
import type { Dictionary } from "@/lib/i18n"

type Step = 1 | 2 | 3 | "result"

const PRESENTATION_OPTIONS: { value: Presentation; label: string }[] = [
  { value: "120g", label: "120g" },
  { value: "300g", label: "300g" },
  { value: "1000g", label: "1000g" },
]

const FRUIT_OPTIONS = (Object.keys(FRUIT_DATA) as FruitKey[]).map((key) => ({
  value: key,
  label: FRUIT_DATA[key].label,
}))

const CUSTOM_VALUE = -1 // sentinel para modo personalizado

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

  const [step, setStep] = useState<Step>(1)
  const [targetCups, setTargetCups] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customCups, setCustomCups] = useState("")
  const [selectedFruit, setSelectedFruit] = useState<FruitKey | null>(null)
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null)

  const cupChipOptions = [
    ...CUP_OPTIONS.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_VALUE, label: "Personalizado" },
  ]

  function handleCupsSelect(value: number) {
    if (value === CUSTOM_VALUE) {
      setShowCustomInput(true)
      setTargetCups(null)
    } else {
      setShowCustomInput(false)
      setCustomCups("")
      setTargetCups(value)
      setStep(2)
    }
  }

  function handleCustomCupsConfirm() {
    const parsed = parseInt(customCups, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setTargetCups(parsed)
      setShowCustomInput(false)
      setStep(2)
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
    setTargetCups(null)
    setShowCustomInput(false)
    setCustomCups("")
    setSelectedFruit(null)
    setSelectedPresentation(null)
  }

  function handleBackToStep1() {
    setStep(1)
    setTargetCups(null)
    setShowCustomInput(false)
    setCustomCups("")
    setSelectedFruit(null)
    setSelectedPresentation(null)
  }

  function handleBackToStep2() {
    setStep(2)
    setSelectedFruit(null)
    setSelectedPresentation(null)
  }

  function handleBackToStep3() {
    setStep(3)
    setSelectedPresentation(null)
  }

  const packs =
    targetCups && selectedPresentation
      ? packsNeeded(targetCups, selectedPresentation)
      : null

  const comparison =
    packs && selectedPresentation && selectedFruit
      ? freshComparison(packs, selectedPresentation, selectedFruit)
      : null

  const whatsappUrl =
    packs && selectedPresentation && selectedFruit && targetCups
      ? buildWhatsappMessage({
          fruit: selectedFruit,
          presentation: selectedPresentation,
          targetCups,
          packsCount: packs,
          whatsappNumber: SITE_CONFIG.whatsappNumber,
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
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-primary/40 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
              {t.sectionLabel}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-3 text-balance">
            {t.title}
          </h2>
          <p className="text-text-muted max-w-[58ch] leading-relaxed">{t.subtitle}</p>
        </m.div>

        <div className="bg-white dark:bg-surface-card rounded-2xl border border-border-mid shadow-sm p-6 md:p-8">

          {/* Paso 1 */}
          <div className={isCompleted ? "mb-6 pb-6 border-b border-border-mid" : ""}>
            <p className="text-sm font-semibold text-text-main mb-3">
              <span className="text-primary mr-2">1.</span>{t.step1Label}
            </p>
            {step === 1 ? (
              <>
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
              </>
            ) : (
              <p className="text-text-muted text-sm flex flex-wrap items-center">
                <span>{targetCups} vasos</span>
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

          {/* Paso 3 */}
          {(step === 3 || step === "result") && (
            <div className={step !== 3 ? "mb-6 pb-6 border-b border-border-mid" : ""}>
              <p className="text-sm font-semibold text-text-main mb-3">
                <span className="text-primary mr-2">3.</span>{t.step3Label}
              </p>
              {step === 3 ? (
                <ChipSelector
                  options={PRESENTATION_OPTIONS}
                  selected={selectedPresentation}
                  onChange={handlePresentationSelect}
                />
              ) : (
                <p className="text-text-muted text-sm flex flex-wrap items-center">
                  <span>{selectedPresentation}</span>
                  <BackLink label={t.back} onClick={handleBackToStep3} />
                </p>
              )}
            </div>
          )}

          {/* Resultado */}
          {step === "result" && packs && comparison && selectedFruit && selectedPresentation && targetCups && (
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="rounded-xl bg-primary/6 border border-primary/20 p-5 mb-5">
                <p className="text-lg font-bold text-text-main mb-1">
                  {interpolate(t.resultPacksNeeded, {
                    count: packs,
                    fruit: FRUIT_DATA[selectedFruit].label,
                    presentation: selectedPresentation,
                  })}
                </p>
                <p className="text-text-muted text-sm mb-4">
                  {interpolate(t.resultCupsYield, {
                    cups: cupsPerPack(selectedPresentation) * packs,
                  })}
                </p>

                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  {t.freshComparisonTitle}
                </p>
                <ul className="space-y-1 text-sm text-text-muted">
                  <li>{interpolate(t.freshKg, { kg: comparison.freshKg })}</li>
                  <li>{interpolate(t.minutesSaved, { minutes: comparison.minutesSaved })}</li>
                  <li>{t.noWaste}</li>
                </ul>
              </div>

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
        </div>
      </div>
    </section>
  )
}
