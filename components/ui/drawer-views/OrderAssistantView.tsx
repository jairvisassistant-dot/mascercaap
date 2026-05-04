"use client"

import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import ChipSelector from "@/components/ui/ChipSelector"
import {
  getProductOptionsForProfile,
  buildWhatsappMessage,
  FRUIT_OPTIONS,
  QUANTITY_OPTIONS,
  ZONE_LABELS,
  URGENCY_LABELS,
  PROFILE_LABELS,
  type ClientProfile,
  type DeliveryZone,
  type Urgency,
} from "@/lib/order-assistant"
import { useDictionary } from "@/lib/i18n/DictionaryProvider"
import { SITE_CONFIG } from "@/lib/config"
import type { Presentation } from "@/lib/yield-calculator"
import type { OrderInput } from "@/lib/schemas/order"

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | "result"
type SubmitStatus = "idle" | "sending" | "success" | "error"

const CUSTOM_QTY = -1
const PRESENTATION_OPTIONS: { value: Presentation; label: string }[] = [
  { value: "120g", label: "120g" },
  { value: "300g", label: "300g" },
  { value: "1000g", label: "1000g" },
]

export default function OrderAssistantView() {
  const { dict } = useDictionary()
  const t = dict.orderAssistant

  const [step, setStep] = useState<Step>(1)
  const [profile, setProfile]             = useState<ClientProfile | null>(null)
  const [productType, setProductType]     = useState<string | null>(null)
  const [fruit, setFruit]                 = useState<string | null>(null)
  const [presentation, setPresentation]   = useState<Presentation | null>(null)
  const [quantity, setQuantity]           = useState<number | null>(null)
  const [showCustomQty, setShowCustomQty] = useState(false)
  const [customQty, setCustomQty]         = useState("")
  const [zone, setZone]                   = useState<DeliveryZone | null>(null)
  const [urgency, setUrgency]             = useState<Urgency | null>(null)

  const [nombre, setNombre]           = useState("")
  const [email, setEmail]             = useState("")
  const [waNumber, setWaNumber]       = useState("")
  const [consent, setConsent]         = useState(false)
  const [status, setStatus]           = useState<SubmitStatus>("idle")
  const [waUrl, setWaUrl]             = useState<string | null>(null)

  const profileOptions = Object.entries(PROFILE_LABELS).map(([v, label]) => ({
    value: v as ClientProfile,
    label,
  }))

  const productOptions = profile
    ? getProductOptionsForProfile(profile).map((v) => ({ value: v, label: v }))
    : []

  const fruitOptions = FRUIT_OPTIONS.map((v) => ({ value: v, label: v }))

  const quantityOptions = [
    ...QUANTITY_OPTIONS.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_QTY, label: "Personalizado" },
  ]

  const zoneOptions = Object.entries(ZONE_LABELS).map(([v, label]) => ({
    value: v as DeliveryZone,
    label,
  }))

  const urgencyOptions = Object.entries(URGENCY_LABELS).map(([v, label]) => ({
    value: v as Urgency,
    label,
  }))

  function handleQtySelect(val: number) {
    if (val === CUSTOM_QTY) {
      setShowCustomQty(true)
      setQuantity(null)
    } else {
      setShowCustomQty(false)
      setCustomQty("")
      setQuantity(val)
      setStep(6)
    }
  }

  function confirmCustomQty() {
    const n = parseInt(customQty, 10)
    if (!isNaN(n) && n > 0) {
      setQuantity(n)
      setShowCustomQty(false)
      setStep(6)
    }
  }

  function canSubmit() {
    return (
      nombre.trim().length >= 2 &&
      (email.trim() || waNumber.trim()) &&
      consent
    )
  }

  async function handleEmailSubmit() {
    if (!canSubmit() || !profile || !productType || !fruit || !presentation || !quantity || !zone || !urgency) return

    const payload: OrderInput = {
      nombre:           nombre.trim(),
      email:            email.trim() || null,
      whatsapp_number:  waNumber.trim() || null,
      consentAccepted:  true,
      profile,
      productType,
      fruit,
      presentation,
      quantity,
      zone,
      urgency,
    }

    setStatus("sending")

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        if (SITE_CONFIG.whatsappNumber) {
          setWaUrl(buildWhatsappMessage(payload, SITE_CONFIG.whatsappNumber))
        }
        setStatus("success")
        setStep("result")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  function handleReset() {
    setStep(1)
    setProfile(null); setProductType(null); setFruit(null)
    setPresentation(null); setQuantity(null); setShowCustomQty(false)
    setCustomQty(""); setZone(null); setUrgency(null)
    setNombre(""); setEmail(""); setWaNumber(""); setConsent(false)
    setStatus("idle"); setWaUrl(null)
  }

  const completedSteps = (step === "result" ? 9 : (step as number)) - 1
  const progress = Math.min((completedSteps / 8) * 100, 100)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra de progreso */}
      <div className="h-1 bg-border-soft shrink-0">
        <m.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Resultado final */}
        {step === "result" && (
          <AnimatePresence mode="wait">
            <m.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-main mb-2">{t.successTitle}</h3>
              <p className="text-text-muted text-sm mb-6">{t.successText}</p>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px] mb-3"
                >
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.857L0 24l6.335-1.518A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.092-1.424l-.366-.217-3.762.902.944-3.653-.238-.374A9.776 9.776 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
                  </svg>
                  {t.ctaWhatsapp}
                </a>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-text-muted underline underline-offset-2 hover:text-text-main transition-colors min-h-[44px]"
              >
                {t.resetLabel}
              </button>
            </m.div>
          </AnimatePresence>
        )}

        {step !== "result" && (
          <>
            {/* Paso 1 */}
            <StepBlock
              number={1}
              label={t.step1Label}
              active={step === 1}
              summary={profile ? PROFILE_LABELS[profile] : null}
              onEdit={() => { setStep(1); setProfile(null); setProductType(null); setFruit(null); setPresentation(null); setQuantity(null); setZone(null); setUrgency(null) }}
              backLabel={t.back}
            >
              <ChipSelector options={profileOptions} selected={profile} onChange={(v) => { setProfile(v); setProductType(null); setStep(2) }} />
            </StepBlock>

            {/* Paso 2 */}
            {step >= 2 && (
              <StepBlock
                number={2}
                label={t.step2Label}
                active={step === 2}
                summary={productType}
                onEdit={() => { setStep(2); setProductType(null); setFruit(null); setPresentation(null); setQuantity(null); setZone(null); setUrgency(null) }}
                backLabel={t.back}
              >
                <ChipSelector options={productOptions} selected={productType} onChange={(v) => { setProductType(v); setFruit(null); setStep(3) }} />
              </StepBlock>
            )}

            {/* Paso 3 */}
            {step >= 3 && (
              <StepBlock
                number={3}
                label={t.step3Label}
                active={step === 3}
                summary={fruit}
                onEdit={() => { setStep(3); setFruit(null); setPresentation(null); setQuantity(null); setZone(null); setUrgency(null) }}
                backLabel={t.back}
              >
                <ChipSelector options={fruitOptions} selected={fruit} onChange={(v) => { setFruit(v); setPresentation(null); setStep(4) }} />
              </StepBlock>
            )}

            {/* Paso 4 */}
            {step >= 4 && (
              <StepBlock
                number={4}
                label={t.step4Label}
                active={step === 4}
                summary={presentation}
                onEdit={() => { setStep(4); setPresentation(null); setQuantity(null); setZone(null); setUrgency(null) }}
                backLabel={t.back}
              >
                <ChipSelector options={PRESENTATION_OPTIONS} selected={presentation} onChange={(v) => { setPresentation(v); setQuantity(null); setStep(5) }} />
              </StepBlock>
            )}

            {/* Paso 5 */}
            {step >= 5 && (
              <StepBlock
                number={5}
                label={t.step5Label}
                active={step === 5}
                summary={quantity ? `${quantity} unidades` : null}
                onEdit={() => { setStep(5); setQuantity(null); setZone(null); setUrgency(null) }}
                backLabel={t.back}
              >
                <ChipSelector options={quantityOptions} selected={showCustomQty ? CUSTOM_QTY : quantity} onChange={handleQtySelect} />
                {showCustomQty && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number" min={1} max={9999}
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      placeholder={t.customQtyPlaceholder}
                      className="w-32 rounded-lg border border-border-mid px-3 py-2 text-sm bg-surface-page focus:outline-none focus:border-primary"
                      onKeyDown={(e) => e.key === "Enter" && confirmCustomQty()}
                      autoFocus
                    />
                    <button type="button" onClick={confirmCustomQty} disabled={!customQty || parseInt(customQty) <= 0}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 min-h-[44px]">
                      OK
                    </button>
                  </div>
                )}
              </StepBlock>
            )}

            {/* Paso 6 */}
            {step >= 6 && (
              <StepBlock
                number={6}
                label={t.step6Label}
                active={step === 6}
                summary={zone ? ZONE_LABELS[zone] : null}
                onEdit={() => { setStep(6); setZone(null); setUrgency(null) }}
                backLabel={t.back}
              >
                <ChipSelector options={zoneOptions} selected={zone} onChange={(v) => { setZone(v); setUrgency(null); setStep(7) }} />
              </StepBlock>
            )}

            {/* Paso 7 */}
            {step >= 7 && (
              <StepBlock
                number={7}
                label={t.step7Label}
                active={step === 7}
                summary={urgency ? URGENCY_LABELS[urgency] : null}
                onEdit={() => { setStep(7); setUrgency(null) }}
                backLabel={t.back}
              >
                <ChipSelector options={urgencyOptions} selected={urgency} onChange={(v) => { setUrgency(v); setStep(8) }} />
              </StepBlock>
            )}

            {/* Paso 8 — Datos de contacto */}
            {step === 8 && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm font-semibold text-text-main mb-4">
                  <span className="text-primary mr-2">8.</span>{t.step8Label}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t.nameLabel} *</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="w-full rounded-lg border border-border-mid px-3 py-2.5 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t.emailLabel}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full rounded-lg border border-border-mid px-3 py-2.5 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">{t.whatsappLabel}</label>
                    <input
                      type="tel"
                      value={waNumber}
                      onChange={(e) => setWaNumber(e.target.value)}
                      placeholder={t.whatsappPlaceholder}
                      className="w-full rounded-lg border border-border-mid px-3 py-2.5 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">{t.contactHint}</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                    />
                    <span className="text-xs text-text-muted leading-relaxed">{t.consentLabel}</span>
                  </label>
                </div>

                {status === "error" && (
                  <p className="mt-3 text-xs text-red-600">{t.errorText}</p>
                )}

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleEmailSubmit}
                    disabled={!canSubmit() || status === "sending"}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px] disabled:opacity-50"
                  >
                    {status === "sending" ? t.sending : t.ctaEmail}
                  </button>
                </div>
              </m.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Bloque de paso reutilizable
function StepBlock({
  number, label, active, summary, onEdit, backLabel, children,
}: {
  number: number
  label: string
  active: boolean
  summary: string | null
  onEdit: () => void
  backLabel: string
  children: React.ReactNode
}) {
  if (!active && !summary) return null

  return (
    <div className={!active ? "pb-4 border-b border-border-soft" : ""}>
      <p className="text-sm font-semibold text-text-main mb-3">
        <span className="text-primary mr-2">{number}.</span>{label}
      </p>
      {active ? (
        children
      ) : (
        <p className="text-text-muted text-sm flex flex-wrap items-center gap-1">
          <span>{summary}</span>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center min-h-[36px] px-2 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            {backLabel}
          </button>
        </p>
      )}
    </div>
  )
}
