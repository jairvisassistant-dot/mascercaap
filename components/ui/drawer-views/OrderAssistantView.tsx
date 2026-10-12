"use client"

import { useReducer, useMemo } from "react"
import { m } from "framer-motion"
import {
  buildWhatsappMessage,
  is120gPackPresentation,
  buildPriceResolver,
  buildCatalog,
  getProductTypeForLine,
} from "@/lib/order-assistant"
import type { Dictionary } from "@/lib/i18n"
import type { PriceEntry, CatalogLine, Catalog } from "@/lib/order-assistant"
import { SITE_CONFIG } from "@/lib/config"
import type { OrderItem, OrderInput } from "@/lib/schemas/order"
import type { State, Action } from "./order/types"
import {
  CUSTOM_QTY,
  buildCurrentItem,
  buildFruitOptions,
  buildPresentationOptions,
  buildProductOptions,
  buildQuantityOptions,
  canSubmitOrder,
  computeDeliveryInfo,
  computeFreeDeliveryMessage,
  computeOrderTotals,
  computeProgress,
  isValidCustomQty,
} from "./order-derived"
import OrderStep1 from "./order/OrderStep1"
import OrderSteps234 from "./order/OrderSteps234"
import OrderCart from "./order/OrderCart"
import OrderContactForm from "./order/OrderContactForm"
import OrderSuccess from "./order/OrderSuccess"

type Props = {
  dict: Dictionary;
  prices: PriceEntry[];
  lines:  CatalogLine[];
  onContactClick: () => void
  initialLineKey?: string | null
  initialPresentation?: string | null
}

const INITIAL_STATE: State = {
  step: 1,
  items: [],
  curProductType: null,
  curLineKey: null,
  curPresentation: null,
  showCustomQty: false,
  customQty: "",
  nombre: "",
  email: "",
  waNumber: "",
  consent: false,
  status: "idle",
  waUrl: null,
};

// Preselects productType/lineKey (and presentation, when valid) from the card
// the user clicked, so the assistant lands past the redundant step-1/2 prompts.
function buildInitialState(
  lines: CatalogLine[],
  catalog: Catalog,
  initialLineKey: string | null,
  initialPresentation: string | null
): State {
  if (!initialLineKey) return INITIAL_STATE

  const productType = getProductTypeForLine(lines, initialLineKey)
  if (!productType) return INITIAL_STATE

  const lineIsSelectable = catalog.getProductOptionsForType(productType).some((o) => o.value === initialLineKey)
  if (!lineIsSelectable) return INITIAL_STATE

  if (productType === "Lácteos") {
    return { ...INITIAL_STATE, curProductType: productType, curLineKey: initialLineKey, step: 4 };
  }

  const presentations = catalog.getPresentationsForProduct(productType, initialLineKey)
  const presentation = initialPresentation && presentations.includes(initialPresentation) ? initialPresentation : null

  return {
    ...INITIAL_STATE,
    curProductType: productType,
    curLineKey: initialLineKey,
    curPresentation: presentation,
    step: presentation ? 4 : 3,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "selectProductType":
      return { ...state, curProductType: action.value, curLineKey: null, curPresentation: null, step: 2 };
    case "editStep1":
      return { ...state, step: 1, curProductType: null, curLineKey: null, curPresentation: null };
    case "selectLineKey":
      return { ...state, curLineKey: action.value, curPresentation: null, step: action.nextStep };
    case "editStep2":
      return { ...state, step: 2, curLineKey: null, curPresentation: null };
    case "selectPresentation":
      return { ...state, curPresentation: action.value, step: 4 };
    case "editStep3":
      return { ...state, step: 3, curPresentation: null };
    case "showCustomQty":
      return { ...state, showCustomQty: true };
    case "setCustomQty":
      return { ...state, customQty: action.value };
    case "commitItem":
      return {
        ...state,
        items: [...state.items, action.item],
        curProductType: null,
        curLineKey: null,
        curPresentation: null,
        showCustomQty: false,
        customQty: "",
        step: "cart",
      };
    case "cancelToCart":
      return {
        ...state,
        curProductType: null,
        curLineKey: null,
        curPresentation: null,
        showCustomQty: false,
        customQty: "",
        step: "cart",
      };
    case "goToStep":
      return { ...state, step: action.step };
    case "removeItem":
      return { ...state, items: state.items.filter((_, i) => i !== action.index) };
    case "setContact":
      return { ...state, [action.field]: action.value };
    case "setConsent":
      return { ...state, consent: action.value };
    case "submitStart":
      return { ...state, status: "sending" };
    case "submitSuccess":
      return { ...state, status: "success", waUrl: action.waUrl, step: "result" };
    case "submitError":
      return { ...state, status: "error" };
    case "reset":
      return INITIAL_STATE;
    default:
      return state;
  }
}

export default function OrderAssistantView({ dict, prices, lines, onContactClick, initialLineKey = null, initialPresentation = null }: Props) {
  const t = dict.orderAssistant
  const resolvePrice = useMemo(() => buildPriceResolver(prices), [prices])
  const catalog      = useMemo(() => buildCatalog(lines, prices), [lines, prices])

  const [state, dispatch] = useReducer(
    reducer,
    INITIAL_STATE,
    () => buildInitialState(lines, catalog, initialLineKey, initialPresentation)
  )
  const {
    step, items,
    curProductType, curLineKey, curPresentation, showCustomQty, customQty,
    nombre, email, waNumber, consent, status, waUrl,
  } = state

  // ── Derived ───────────────────────────────────────────────────
  const totals              = computeOrderTotals(items, resolvePrice)
  const has120gItems        = items.some((item) => is120gPackPresentation(item.presentation))
  const deliveryInfo        = computeDeliveryInfo(totals)
  const freeDeliveryMessage = computeFreeDeliveryMessage(deliveryInfo, t)
  const progress            = computeProgress(step)

  const productTypeLabels = t.productTypes as Record<string, string>
  const productOptions    = buildProductOptions(t)

  const isLacteos            = curProductType === "Lácteos"
  const currentSelectionLabel = catalog.getLabelForSelection(curProductType ?? "", curLineKey)
  const fruitOptions         = buildFruitOptions(catalog, curProductType, isLacteos, resolvePrice)
  const presentationOptions  = buildPresentationOptions(
    catalog,
    curProductType,
    curLineKey,
    currentSelectionLabel,
    resolvePrice,
    t
  )

  const isPack120gSelection = is120gPackPresentation(curPresentation)
  const quantityOptions     = buildQuantityOptions(isPack120gSelection, t)

  // ── Helpers ───────────────────────────────────────────────────
  function buildOrderItem(qty: number): OrderItem | null {
    return buildCurrentItem(qty, catalog, isLacteos, curProductType, curLineKey, curPresentation)
  }

  function handleQtySelect(val: number) {
    if (val === CUSTOM_QTY) {
      dispatch({ type: "showCustomQty" })
    } else {
      const item = buildOrderItem(val)
      if (item) dispatch({ type: "commitItem", item })
    }
  }

  function confirmCustomQty() {
    const n = isValidCustomQty(customQty)
    if (n !== null) {
      const item = buildOrderItem(n)
      if (item) dispatch({ type: "commitItem", item })
    }
  }

  async function handleEmailSubmit() {
    if (!canSubmitOrder(nombre, email, waNumber, consent) || items.length === 0) return

    const payload: OrderInput = {
      nombre:          nombre.trim(),
      email:           email.trim() || null,
      whatsapp_number: waNumber.trim() || null,
      consentAccepted: true,
      profile:         "hogar",
      items,
    }

    dispatch({ type: "submitStart" })
    try {
      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })
      if (res.ok) {
        const newWaUrl = SITE_CONFIG.whatsappNumber
          ? buildWhatsappMessage(payload, SITE_CONFIG.whatsappNumber, {
              greeting: t.waGreeting,
              products: t.waProducts,
              confirm:  t.waConfirm,
            })
          : null
        dispatch({ type: "submitSuccess", waUrl: newWaUrl })
      } else {
        dispatch({ type: "submitError" })
      }
    } catch {
      dispatch({ type: "submitError" })
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-border-soft shrink-0">
        <m.div
          className="h-full w-full origin-left bg-primary"
          animate={{ scaleX: Math.max(0, Math.min(1, progress / 100)) }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Wholesale banner */}
      <div className="shrink-0 border-b border-accent-light/70 bg-accent-light/20 px-6 py-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-accent-light/80 bg-surface-card px-4 py-3 shadow-[0_14px_34px_-28px_rgba(201,112,22,0.65)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-snug text-accent-dark">
            {t.wholesaleBannerText}
          </p>
          <button
            type="button"
            onClick={onContactClick}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-card"
          >
            {t.wholesaleBannerButton}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Success / result screen */}
        {step === "result" && (
          <OrderSuccess
            items={items}
            totals={totals}
            has120gItems={has120gItems}
            freeDeliveryMessage={freeDeliveryMessage}
            deliveryInfo={deliveryInfo}
            waUrl={waUrl}
            resolvePrice={resolvePrice}
            t={{
              successTitle:        t.successTitle,
              successText:         t.successText,
              packShort:           t.packShort,
              unitsShort:          t.unitsShort,
              subtotalLabel:       t.subtotalLabel,
              totalLabel:          t.totalLabel,
              taxIncludedNote:     t.taxIncludedNote,
              priceNote:           t.priceNote,
              freeDelivery120gHint: t.freeDelivery120gHint,
              ctaWhatsapp:         t.ctaWhatsapp,
              successNoWhatsapp:   t.successNoWhatsapp,
              resetLabel:          t.resetLabel,
            }}
            dispatch={dispatch}
          />
        )}

        {/* Steps 1–6 */}
        {step !== "result" && (
          <>
            {/* Step 1 — Product type */}
            <OrderStep1
              step={step}
              curProductType={curProductType}
              productOptions={productOptions}
              productTypeLabels={productTypeLabels}
              backLabel={t.back}
              stepLabel={t.step1Label}
              dispatch={dispatch}
            />

            {/* Steps 2–4 — Fruit, presentation, quantity */}
            {(step === 2 || step === 3 || step === 4) && (
              <OrderSteps234
                step={step}
                curLineKey={curLineKey}
                curPresentation={curPresentation}
                showCustomQty={showCustomQty}
                customQty={customQty}
                isLacteos={isLacteos}
                isPack120gSelection={isPack120gSelection}
                currentSelectionLabel={currentSelectionLabel}
                fruitOptions={fruitOptions}
                presentationOptions={presentationOptions}
                quantityOptions={quantityOptions}
                items={items}
                t={{
                  step2Label:               t.step2Label,
                  step4Label:               t.step4Label,
                  step5Label:               t.step5Label,
                  back:                     t.back,
                  customQtyLabel:           t.customQtyLabel,
                  customQtyPlaceholder:     t.customQtyPlaceholder,
                  presentation120gPackNote: t.presentation120gPackNote,
                  cancelToCart:             t.cancelToCart,
                }}
                dispatch={dispatch}
                handleQtySelect={handleQtySelect}
                confirmCustomQty={confirmCustomQty}
                CUSTOM_QTY={CUSTOM_QTY}
              />
            )}

            {/* Cart view */}
            {step === "cart" && (
              <OrderCart
                items={items}
                totals={totals}
                has120gItems={has120gItems}
                freeDeliveryMessage={freeDeliveryMessage}
                deliveryInfo={deliveryInfo}
                resolvePrice={resolvePrice}
                t={{
                  cartLabel:           t.cartLabel,
                  packShort:           t.packShort,
                  unitsShort:          t.unitsShort,
                  removeItem:          t.removeItem,
                  subtotalLabel:       t.subtotalLabel,
                  totalLabel:          t.totalLabel,
                  taxIncludedNote:     t.taxIncludedNote,
                  priceNote:           t.priceNote,
                  freeDelivery120gHint: t.freeDelivery120gHint,
                  addAnother:          t.addAnother,
                  continueLabel:       t.continueLabel,
                }}
                dispatch={dispatch}
              />
            )}

            {/* Step 6 — Contact form */}
            {step === 6 && (
              <OrderContactForm
                nombre={nombre}
                email={email}
                waNumber={waNumber}
                consent={consent}
                status={status}
                canSubmit={canSubmitOrder(nombre, email, waNumber, consent)}
                t={{
                  step6Label:        t.step6Label,
                  nameLabel:         t.nameLabel,
                  namePlaceholder:   t.namePlaceholder,
                  emailLabel:        t.emailLabel,
                  emailPlaceholder:  t.emailPlaceholder,
                  whatsappLabel:     t.whatsappLabel,
                  whatsappPlaceholder: t.whatsappPlaceholder,
                  contactHint:       t.contactHint,
                  consentLabel:      t.consentLabel,
                  errorText:         t.errorText,
                  sending:           t.sending,
                  ctaEmail:          t.ctaEmail,
                }}
                dispatch={dispatch}
                onSubmit={handleEmailSubmit}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
