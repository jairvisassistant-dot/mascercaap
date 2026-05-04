"use client"

import { useState } from "react"
import { m, AnimatePresence } from "framer-motion"
import ChipSelector from "@/components/ui/ChipSelector"
import {
  getProductOptionsForProfile,
  getProductOptionsForType,
  buildWhatsappMessage,
  getUnitPrice,
  calculateOrderTotal,
  formatCOP,
  QUANTITY_OPTIONS,
  PROFILE_LABELS,
  type ClientProfile,
} from "@/lib/order-assistant"
import { useDictionary } from "@/lib/i18n/DictionaryProvider"
import { SITE_CONFIG } from "@/lib/config"
import type { OrderItem, OrderInput } from "@/lib/schemas/order"

type Presentation = "120g" | "300g" | "1000g"
type Step = 1 | 2 | 3 | 4 | 5 | "cart" | 6 | "result"
type SubmitStatus = "idle" | "sending" | "success" | "error"

const CUSTOM_QTY = -1
const PRESENTATION_OPTIONS: { value: Presentation; label: string }[] = [
  { value: "120g",   label: "120g" },
  { value: "300g",   label: "300g" },
  { value: "1000g",  label: "1000g" },
]

export default function OrderAssistantView() {
  const { dict } = useDictionary()
  const t = dict.orderAssistant

  // ── Global state ───────────────────────────────────────────────
  const [step, setStep]       = useState<Step>(1)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [items, setItems]     = useState<OrderItem[]>([])

  // ── Current item being built (steps 2–5) ─────────────────────
  const [curProductType, setCurProductType]   = useState<string | null>(null)
  const [curFruit, setCurFruit]               = useState<string | null>(null)
  const [curPresentation, setCurPresentation] = useState<Presentation | null>(null)
  const [showCustomQty, setShowCustomQty]     = useState(false)
  const [customQty, setCustomQty]             = useState("")

  // ── Contact & submit ──────────────────────────────────────────
  const [nombre, setNombre]   = useState("")
  const [email, setEmail]     = useState("")
  const [waNumber, setWaNumber] = useState("")
  const [consent, setConsent] = useState(false)
  const [status, setStatus]   = useState<SubmitStatus>("idle")
  const [waUrl, setWaUrl]     = useState<string | null>(null)

  // ── Derived ───────────────────────────────────────────────────
  const totals   = items.length > 0 ? calculateOrderTotal(items) : null
  const stepNum  = step === "result" ? 7 : step === "cart" ? 5.5 : (step as number)
  const progress = Math.min((stepNum / 6) * 100, 100)

  const profileOptions = Object.entries(PROFILE_LABELS).map(([v, label]) => ({
    value: v as ClientProfile,
    label,
  }))

  const productOptions = profile
    ? getProductOptionsForProfile(profile).map((v) => ({ value: v, label: v }))
    : []

  const fruitOptions = getProductOptionsForType(curProductType ?? "").map((v) => ({ value: v, label: v }))
  const isLacteos = curProductType === "Lácteos"

  // Chips de presentación con precio cuando hay fruta seleccionada
  const presentationOptions = PRESENTATION_OPTIONS.map(({ value, label }) => {
    const price = curFruit ? getUnitPrice(curFruit, value) : null
    return { value, label: price !== null ? `${label} — ${formatCOP(price)}` : label }
  })

  const quantityOptions = [
    ...QUANTITY_OPTIONS.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_QTY, label: "Personalizado" },
  ]

  // ── Helpers ───────────────────────────────────────────────────
  function resetCurrentItem() {
    setCurProductType(null)
    setCurFruit(null)
    setCurPresentation(null)
    setShowCustomQty(false)
    setCustomQty("")
  }

  function commitItem(qty: number) {
    if (!curProductType || !curFruit || !curPresentation) return
    setItems((prev) => [
      ...prev,
      { productType: curProductType, fruit: curFruit, presentation: curPresentation, quantity: qty },
    ])
    resetCurrentItem()
    setStep("cart")
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleQtySelect(val: number) {
    if (val === CUSTOM_QTY) {
      setShowCustomQty(true)
    } else {
      setShowCustomQty(false)
      setCustomQty("")
      commitItem(val)
    }
  }

  function confirmCustomQty() {
    const n = parseInt(customQty, 10)
    if (!isNaN(n) && n > 0) {
      setShowCustomQty(false)
      commitItem(n)
    }
  }

  function canSubmit() {
    return nombre.trim().length >= 2 && (email.trim() || waNumber.trim()) && consent
  }

  async function handleEmailSubmit() {
    if (!canSubmit() || !profile || items.length === 0) return

    const payload: OrderInput = {
      nombre:          nombre.trim(),
      email:           email.trim() || null,
      whatsapp_number: waNumber.trim() || null,
      consentAccepted: true,
      profile,
      items,
    }

    setStatus("sending")
    try {
      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
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
    setStep(1); setProfile(null); setItems([])
    resetCurrentItem()
    setNombre(""); setEmail(""); setWaNumber(""); setConsent(false)
    setStatus("idle"); setWaUrl(null)
  }

  // ── Render ─────────────────────────────────────────────────────
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

        {/* ── Resultado final ─────────────────────────────────── */}
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

              {/* Resumen del pedido */}
              {totals && (
                <div className="w-full text-left bg-surface-page rounded-xl border border-border-soft p-4 mb-5 space-y-2">
                  {items.map((item, i) => {
                    const price = getUnitPrice(item.fruit, item.presentation)
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-text-sub">{item.fruit}{item.presentation ? ` ${item.presentation}` : ""} × {item.quantity} {t.unitsShort}</span>
                        <span className="text-text-muted">{price !== null ? formatCOP(price * item.quantity) : "—"}</span>
                      </div>
                    )
                  })}
                  {totals.hasPrice && (
                    <>
                      <div className="border-t border-border-soft pt-2 flex justify-between text-sm">
                        <span className="text-text-muted">{t.subtotalLabel}</span>
                        <span className="text-text-muted">{formatCOP(totals.subtotal)}</span>
                      </div>
                      {totals.discountRate > 0 && (
                        <div className="flex justify-between text-sm text-primary">
                          <span>{(totals.discountRate * 100).toFixed(0)}% {t.discountSuffix}</span>
                          <span>−{formatCOP(totals.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-text-main">{t.totalLabel}</span>
                        <span className="text-primary">{formatCOP(totals.total)}</span>
                      </div>
                      <p className="text-[11px] text-text-faint">{t.priceNote}</p>
                    </>
                  )}
                </div>
              )}

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

        {/* ── Pasos 1–8 ────────────────────────────────────────── */}
        {step !== "result" && (
          <>
            {/* Paso 1 — Perfil */}
            <StepBlock
              number={1}
              label={t.step1Label}
              active={step === 1}
              summary={profile ? PROFILE_LABELS[profile] : null}
              onEdit={() => { setStep(1); setProfile(null); resetCurrentItem() }}
              backLabel={t.back}
            >
              <ChipSelector
                options={profileOptions}
                selected={profile}
                onChange={(v) => { setProfile(v); resetCurrentItem(); setStep(2) }}
              />
            </StepBlock>

            {/* ── Construcción del ítem actual (pasos 2–5) ───── */}
            {(step === 2 || step === 3 || step === 4 || step === 5) && (
              <>
                {/* Paso 2 — Tipo de producto */}
                <StepBlock
                  number={2}
                  label={t.step2Label}
                  active={step === 2}
                  summary={curProductType}
                  onEdit={() => { setStep(2); setCurProductType(null); setCurFruit(null); setCurPresentation(null) }}
                  backLabel={t.back}
                >
                  <ChipSelector
                    options={productOptions}
                    selected={curProductType}
                    onChange={(v) => { setCurProductType(v); setCurFruit(null); setStep(3) }}
                  />
                </StepBlock>

                {/* Paso 3 — Fruta */}
                {step >= 3 && (
                  <StepBlock
                    number={3}
                    label={t.step3Label}
                    active={step === 3}
                    summary={curFruit}
                    onEdit={() => { setStep(3); setCurFruit(null); setCurPresentation(null) }}
                    backLabel={t.back}
                  >
                    <ChipSelector
                      options={fruitOptions}
                      selected={curFruit}
                      onChange={(v) => {
                        setCurFruit(v)
                        setCurPresentation(null)
                        setStep(isLacteos ? 5 : 4)
                      }}
                    />
                  </StepBlock>
                )}

                {/* Paso 4 — Presentación (con precio) */}
                {step >= 4 && (
                  <StepBlock
                    number={4}
                    label={t.step4Label}
                    active={step === 4}
                    summary={curPresentation}
                    onEdit={() => { setStep(4); setCurPresentation(null) }}
                    backLabel={t.back}
                  >
                    <ChipSelector
                      options={presentationOptions}
                      selected={curPresentation}
                      onChange={(v) => { setCurPresentation(v as Presentation); setStep(5) }}
                    />
                  </StepBlock>
                )}

                {/* Paso 5 — Cantidad */}
                {step === 5 && (
                  <StepBlock
                    number={5}
                    label={t.step5Label}
                    active={true}
                    summary={null}
                    onEdit={() => {}}
                    backLabel={t.back}
                  >
                    <ChipSelector
                      options={quantityOptions}
                      selected={showCustomQty ? CUSTOM_QTY : null}
                      onChange={handleQtySelect}
                    />
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
                        <button
                          type="button"
                          onClick={confirmCustomQty}
                          disabled={!customQty || parseInt(customQty) <= 0}
                          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 min-h-[44px]"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </StepBlock>
                )}

                {/* Link para volver al carrito si ya hay ítems */}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { resetCurrentItem(); setStep("cart") }}
                    className="text-sm text-text-muted underline underline-offset-2 hover:text-text-main transition-colors"
                  >
                    {t.cancelToCart} ({items.length})
                  </button>
                )}
              </>
            )}

            {/* ── Vista del carrito ────────────────────────────── */}
            {step === "cart" && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <p className="text-sm font-semibold text-text-main">
                  <span className="text-primary mr-2">🛒</span>{t.cartLabel}
                </p>

                {/* Lista de ítems */}
                <div className="rounded-xl border border-border-soft overflow-hidden">
                  {items.map((item, i) => {
                    const price = getUnitPrice(item.fruit, item.presentation)
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-3 border-b border-border-soft last:border-0 bg-surface-card"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-main">
                            {item.fruit}{item.presentation ? ` ${item.presentation}` : ""}
                          </p>
                          <p className="text-xs text-text-muted">
                            {item.quantity} {t.unitsShort}
                            {price !== null && (
                              <span className="ml-2 text-text-sub">{formatCOP(price * item.quantity)}</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors min-h-[36px] px-2"
                          aria-label={`${t.removeItem} ${item.fruit}`}
                        >
                          {t.removeItem}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Totales */}
                {totals?.hasPrice && (
                  <div className="rounded-xl bg-surface-page border border-border-soft p-4 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{t.subtotalLabel}</span>
                      <span className="text-text-muted">{formatCOP(totals.subtotal)}</span>
                    </div>
                    {totals.discountRate > 0 && (
                      <div className="flex justify-between text-sm text-primary">
                        <span>{(totals.discountRate * 100).toFixed(0)}% {t.discountSuffix}</span>
                        <span>−{formatCOP(totals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-border-soft pt-1.5">
                      <span className="text-text-main">{t.totalLabel}</span>
                      <span className="text-primary">{formatCOP(totals.total)}</span>
                    </div>
                    <p className="text-[11px] text-text-faint">{t.priceNote}</p>
                  </div>
                )}

                {/* Acciones del carrito */}
                <button
                  type="button"
                  onClick={() => { resetCurrentItem(); setStep(2) }}
                  className="w-full text-sm text-primary border border-primary/30 rounded-full px-4 py-2.5 hover:bg-primary/5 transition-colors min-h-[44px]"
                >
                  {t.addAnother}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  disabled={items.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px] disabled:opacity-50"
                >
                  {t.continueLabel}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </m.div>
            )}

            {/* ── Paso 6 — Datos de contacto ───────────────────── */}
            {step === 6 && (
              <>
                  <m.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm font-semibold text-text-main mb-4">
                      <span className="text-primary mr-2">6.</span>{t.step8Label}
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

                    <div className="mt-5">
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── StepBlock reutilizable ────────────────────────────────────────
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
