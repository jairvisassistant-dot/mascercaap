import type { Dictionary } from "@/lib/i18n"
import {
  calculateOrderTotal,
  formatCOP,
  getDeliveryBenefit,
  PRESENTATION_120G,
  PRODUCT_TYPE_OPTIONS,
  QUANTITY_OPTIONS,
  QUANTITY_OPTIONS_120G_PACKS,
} from "@/lib/order-assistant"
import type { Catalog, PriceResolver } from "@/lib/order-assistant"
import type { OrderItem } from "@/lib/schemas/order"
import type { Step } from "./order/types"

/**
 * Pure derivations for the order assistant view.
 *
 * Every function here is a total function of its inputs (catalog, prices,
 * current selection and dictionary), so the view component stays free of
 * inline ternary chains and can compute its view model in one pass.
 */

export const CUSTOM_QTY = -1

export type OrderTotals = ReturnType<typeof calculateOrderTotal>
export type DeliveryInfo = ReturnType<typeof getDeliveryBenefit>

export type OrderOption = { value: string; label: string; sublabel?: string }
export type QuantityOption = { value: number; label: string }

export function computeOrderTotals(
  items: OrderItem[],
  resolvePrice: PriceResolver
): OrderTotals | null {
  return items.length > 0 ? calculateOrderTotal(items, resolvePrice) : null
}

export function computeDeliveryInfo(totals: OrderTotals | null): DeliveryInfo | null {
  return totals?.hasPrice ? getDeliveryBenefit(totals.total) : null
}

export function computeFreeDeliveryMessage(
  deliveryInfo: DeliveryInfo | null,
  t: Dictionary["orderAssistant"]
): string | null {
  if (!deliveryInfo) return null
  return deliveryInfo.qualifiesFreeDelivery
    ? t.freeDeliveryQualified
    : t.freeDeliveryPending.replace("{amount}", formatCOP(deliveryInfo.missingAmount))
}

/** Progress percentage for the step indicator, capped at 100. */
export function computeProgress(step: Step): number {
  const stepNum = step === "result" ? 6 : step === "cart" ? 4.5 : (step as number)
  return Math.min((stepNum / 5) * 100, 100)
}

export function buildProductOptions(
  t: Dictionary["orderAssistant"]
): OrderOption[] {
  const labels = t.productTypes as Record<string, string>
  return PRODUCT_TYPE_OPTIONS.map((value) => ({
    value,
    label: labels[value] ?? value,
  }))
}

export function buildFruitOptions(
  catalog: Catalog,
  curProductType: string | null,
  isLacteos: boolean,
  resolvePrice: PriceResolver
): OrderOption[] {
  return catalog.getProductOptionsForType(curProductType ?? "").map((option) => {
    const price = isLacteos
      ? resolvePrice({
          productType: curProductType ?? "",
          fruit: option.label,
          lineKey: option.value,
          presentation: null,
        })
      : null
    return {
      value: option.value,
      label: option.label,
      sublabel: price !== null ? formatCOP(price) : undefined,
    }
  })
}

export function buildPresentationOptions(
  catalog: Catalog,
  curProductType: string | null,
  curLineKey: string | null,
  currentSelectionLabel: string | null,
  resolvePrice: PriceResolver,
  t: Dictionary["orderAssistant"]
): OrderOption[] {
  const presentations = curProductType && curLineKey
    ? catalog.getPresentationsForProduct(curProductType, curLineKey)
    : []
  return presentations.map((pres) => {
    const price = resolvePrice({
      productType: curProductType ?? "",
      fruit: currentSelectionLabel ?? "",
      lineKey: curLineKey,
      presentation: pres,
    })
    return {
      value: pres,
      label: price !== null ? `${pres} — ${formatCOP(price)}` : pres,
      sublabel: pres === PRESENTATION_120G ? t.presentation120gPackNote : undefined,
    }
  })
}

export function buildQuantityOptions(
  isPack120gSelection: boolean,
  t: Dictionary["orderAssistant"]
): QuantityOption[] {
  const base = isPack120gSelection ? QUANTITY_OPTIONS_120G_PACKS : QUANTITY_OPTIONS
  return [
    ...base.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_QTY, label: t.customQtyLabel },
  ]
}

/** True when the current selection is ready to be committed as an item. */
export function canBuildCurrentItem(
  isLacteos: boolean,
  curProductType: string | null,
  curLineKey: string | null,
  curPresentation: string | null
): boolean {
  if (!curProductType || !curLineKey) return false
  if (!isLacteos && curPresentation === null) return false
  return true
}

export function buildCurrentItem(
  qty: number,
  catalog: Catalog,
  isLacteos: boolean,
  curProductType: string | null,
  curLineKey: string | null,
  curPresentation: string | null
): OrderItem | null {
  if (!canBuildCurrentItem(isLacteos, curProductType, curLineKey, curPresentation)) return null
  const visibleLabel = catalog.getLabelForSelection(curProductType!, curLineKey!) ?? curLineKey!
  return {
    productType: curProductType!,
    fruit: visibleLabel,
    lineKey: curLineKey!,
    presentation: curPresentation,
    quantity: qty,
  }
}

export function isValidCustomQty(raw: string): number | null {
  const n = parseInt(raw, 10)
  return !isNaN(n) && n > 0 ? n : null
}

export function canSubmitOrder(
  nombre: string,
  email: string,
  waNumber: string,
  consent: boolean
): boolean {
  return nombre.trim().length >= 2 && !!(email.trim() || waNumber.trim()) && consent
}
