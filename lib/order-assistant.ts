import type { OrderInput, OrderItem } from "@/lib/schemas/order"
import { SITE_CONFIG } from "@/lib/config"
import { escapeHtml } from "@/lib/sanitize"
import { buildWhatsAppAppUrl, buildWhatsAppMessage as buildSharedWhatsAppMessage } from "@/lib/whatsapp"

export const PRODUCT_TYPE_OPTIONS = ["Pulpas", "Zumos", "Lácteos"] as const
type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number]

// Supabase product_categories.key → UI product type label
const CATEGORY_TO_TYPE: Record<string, ProductType> = {
  pulpas:  "Pulpas",
  zumos:   "Zumos",
  lacteos: "Lácteos",
}

/** Resolves the UI product type (Pulpas/Zumos/Lácteos) for a given catalog line key. */
export function getProductTypeForLine(lines: CatalogLine[], lineKey: string): string | null {
  const line = lines.find((l) => l.key === lineKey)
  return line?.category_key ? CATEGORY_TO_TYPE[line.category_key] ?? null : null
}

export const QUANTITY_OPTIONS = [5, 10, 20, 50] as const
export const QUANTITY_OPTIONS_120G_PACKS = [1, 2, 3, 4, 5, 10] as const
export const PRESENTATION_120G = "120g"
const PACK_UNITS_120G = 10

export type PriceResolverInput = Pick<OrderItem, "productType" | "fruit" | "presentation"> & {
  lineKey?: string | null
}

export type PriceResolver = (item: PriceResolverInput) => number | null

/** Row shape returned by the Supabase `products` table price query. */
export type PriceEntry = {
  id?:                 string | null
  line:                string | null
  name:                string | null
  presentation:        string | null
  presentation_order?: number | null
  price:               number
}

/** Row shape returned by the Supabase `product_lines` table catalog query. */
export type CatalogLine = {
  key:                    string
  label:                  string
  category_key:           string | null
  display_order:          number
  order_assistant_enabled?: boolean | null
  order_assistant_label?:  string | null
}

function normalizeCatalogValue(value: string): string {
  return value.trim().toLocaleLowerCase("es-CO").replace(/\s+/g, " ")
}

function addScopedAlias(map: Map<string, string>, productType: ProductType, alias: string | null | undefined, lineKey: string) {
  if (!alias) return
  const normalized = normalizeCatalogValue(alias)
  if (!normalized) return
  map.set(`${productType}:${normalized}`, lineKey)
}

function deriveAssistantLabel(line: CatalogLine, productType: ProductType, lineProducts: PriceEntry[]): string | null {
  const explicit = line.order_assistant_label?.trim()
  if (explicit) return explicit

  if (productType === "Pulpas") return line.label.replace(/^Pulpa de\s+/i, "").trim()
  if (productType === "Zumos") return line.label.replace(/^Zumo de\s+/i, "").trim()

  const firstProduct = lineProducts[0]
  if (!firstProduct?.name) return line.label.trim() || null
  return firstProduct.presentation ? `${firstProduct.name} ${firstProduct.presentation}` : firstProduct.name
}

/** Builds a PriceResolver from Supabase product rows and active product_lines metadata. */
export function buildPriceResolver(entries: PriceEntry[], lines: CatalogLine[] = []): PriceResolver {
  const byLinePresentation = new Map<string, number>()
  const scopedAliasToLine  = new Map<string, string>()
  const lineToType         = new Map<string, ProductType>()
  const lineEntries        = new Map<string, PriceEntry[]>()

  for (const line of lines) {
    const productType = line.category_key ? CATEGORY_TO_TYPE[line.category_key] : undefined
    if (!productType) continue
    lineToType.set(line.key, productType)
  }

  for (const p of entries) {
    if (p.presentation && p.line) {
      byLinePresentation.set(`${p.line}:${p.presentation}`, p.price)
      const productsForLine = lineEntries.get(p.line) ?? []
      productsForLine.push(p)
      lineEntries.set(p.line, productsForLine)
    }
  }

  for (const line of lines) {
    const productType = lineToType.get(line.key)
    if (!productType) continue

    addScopedAlias(scopedAliasToLine, productType, line.key, line.key)
    addScopedAlias(scopedAliasToLine, productType, line.label, line.key)

    const lineProducts = lineEntries.get(line.key) ?? []
    const assistantLabel = deriveAssistantLabel(line, productType, lineProducts)
    addScopedAlias(scopedAliasToLine, productType, assistantLabel, line.key)

    for (const product of lineProducts) {
      addScopedAlias(scopedAliasToLine, productType, product.name, line.key)
      addScopedAlias(
        scopedAliasToLine,
        productType,
        product.name && product.presentation ? `${product.name} ${product.presentation}` : null,
        line.key
      )
    }
  }

  const singlePresentationPriceByLine = new Map<string, number>()
  for (const [lineKey, productsForLine] of lineEntries) {
    if (productsForLine.length === 1) singlePresentationPriceByLine.set(lineKey, productsForLine[0].price)
  }

  return (item) => {
    const normalizedFruit = normalizeCatalogValue(item.fruit)
    const legacyScopedKey = `${item.productType}:${normalizedFruit}`
    const lineKey = item.lineKey ?? scopedAliasToLine.get(legacyScopedKey)
    if (!lineKey) return null

    if (!item.presentation) return singlePresentationPriceByLine.get(lineKey) ?? null
    return byLinePresentation.get(`${lineKey}:${item.presentation}`) ?? null
  }
}

/** Dynamic catalog derived from Supabase product_lines and products. */
export type OrderAssistantOption = {
  value: string
  label: string
}

export type Catalog = {
  getProductOptionsForType:   (productType: string) => OrderAssistantOption[]
  getPresentationsForProduct: (productType: string, lineKey: string) => string[]
  getLabelForSelection:       (productType: string, lineKey: string | null | undefined) => string | null
}

/**
 * Builds a Catalog from live Supabase data.
 * - Product lists per type are filtered by active product_lines in Supabase.
 * - Presentations per product are derived from actual product rows (no hardcoded overrides).
 * - Display labels come from DB metadata (`order_assistant_label`) with a temporary
 *   derived fallback to keep old datasets functional until the migration is applied.
 */
export function buildCatalog(lines: CatalogLine[], products: PriceEntry[]): Catalog {
  // Index presentations per line, ordered by presentation_order
  const presentationsByLine = new Map<string, { presentation: string; order: number }[]>()
  const productsByLine       = new Map<string, PriceEntry[]>()
  for (const p of products) {
    if (!p.line || !p.presentation) continue
    if (!presentationsByLine.has(p.line)) presentationsByLine.set(p.line, [])
    const list = presentationsByLine.get(p.line)!
    if (!list.some((e) => e.presentation === p.presentation)) {
      list.push({ presentation: p.presentation, order: p.presentation_order ?? 0 })
    }
    const productList = productsByLine.get(p.line) ?? []
    productList.push(p)
    productsByLine.set(p.line, productList)
  }
  for (const list of presentationsByLine.values()) {
    list.sort((a, b) => a.order - b.order)
  }

  const optionsByType = new Map<string, OrderAssistantOption[]>()
  const allowedLineKeysByType = new Map<string, Set<string>>()
  const labelsByTypeAndLine = new Map<string, string>()

  for (const line of lines) {
    const productType = line.category_key ? CATEGORY_TO_TYPE[line.category_key] : undefined
    if (!productType) continue
    if (line.order_assistant_enabled === false) continue

    const lineProducts = productsByLine.get(line.key) ?? []
    if (lineProducts.length === 0) continue

    const label = deriveAssistantLabel(line, productType, lineProducts)
    if (!label) continue

    const options = optionsByType.get(productType) ?? []
    options.push({ value: line.key, label })
    optionsByType.set(productType, options)

    const allowedLineKeys = allowedLineKeysByType.get(productType) ?? new Set<string>()
    allowedLineKeys.add(line.key)
    allowedLineKeysByType.set(productType, allowedLineKeys)

    labelsByTypeAndLine.set(`${productType}:${line.key}`, label)
  }

  return {
    getProductOptionsForType(productType: string): OrderAssistantOption[] {
      return optionsByType.get(productType) ?? []
    },

    getPresentationsForProduct(productType: string, lineKey: string): string[] {
      if (!(allowedLineKeysByType.get(productType)?.has(lineKey) ?? false)) return []
      return (presentationsByLine.get(lineKey) ?? []).map((p) => p.presentation)
    },

    getLabelForSelection(productType: string, lineKey: string | null | undefined): string | null {
      if (!lineKey) return null
      return labelsByTypeAndLine.get(`${productType}:${lineKey}`) ?? null
    },
  }
}

export function is120gPackPresentation(presentation: string | null | undefined): boolean {
  return presentation === PRESENTATION_120G
}

function toBillableUnits(item: Pick<OrderItem, "presentation" | "quantity">): number {
  return is120gPackPresentation(item.presentation) ? item.quantity * PACK_UNITS_120G : item.quantity
}

export function calculateItemLineTotal(
  item: Pick<OrderItem, "productType" | "fruit" | "lineKey" | "presentation" | "quantity">,
  resolvePrice: PriceResolver = () => null
): number | null {
  const price = resolvePrice(item)
  if (price === null) return null
  return price * toBillableUnits(item)
}

type OrderTotals = {
  subtotal:     number
  totalUnits:   number
  discountRate: number
  discount:     number
  total:        number
  hasPrice:     boolean
}

const FREE_DELIVERY_THRESHOLD_COP = 60_000

type DeliveryBenefit = {
  qualifiesFreeDelivery: boolean
  missingAmount: number
}

export function getDeliveryBenefit(total: number): DeliveryBenefit {
  const missingAmount = Math.max(0, FREE_DELIVERY_THRESHOLD_COP - total)
  return {
    qualifiesFreeDelivery: missingAmount === 0,
    missingAmount,
  }
}

export function calculateOrderTotal(items: OrderItem[], resolvePrice: PriceResolver = () => null): OrderTotals {
  const totalUnits  = items.reduce((sum, item) => sum + toBillableUnits(item), 0)
  const discountRate = 0
  let subtotal  = 0
  let hasPrice  = items.length > 0
  const lookup  = resolvePrice

  for (const item of items) {
    const lineTotal = calculateItemLineTotal(item, lookup)
    if (lineTotal === null) { hasPrice = false; continue }
    subtotal += lineTotal
  }

  const discount = Math.round(subtotal * discountRate)
  return { subtotal, totalUnits, discountRate, discount, total: subtotal - discount, hasPrice }
}

export function formatCOP(n: number): string {
  return `$${n.toLocaleString("es-CO")}`
}

type WaMsgI18n = {
  greeting?:     string
  clientType?:   string | null
  products?:     string
  confirm?:      string
  profileLabel?: string | null
}

export function buildWhatsappMessage(order: OrderInput, waNumber: string, i18n: WaMsgI18n = {}): string {
  const greeting     = i18n.greeting     ?? "Hola, quiero hacer un pedido:"
  const clientType   = i18n.clientType   ?? "Tipo de cliente"
  const products     = i18n.products     ?? "Productos"
  const confirm      = i18n.confirm      ?? "¿Me confirman disponibilidad y precio?"
  const profileLabel = i18n.profileLabel ?? null

  const itemLines = order.items.map((item, idx) => {
    const pres = item.presentation ? ` ${item.presentation}` : ""
    const qtyLabel = is120gPackPresentation(item.presentation)
      ? `${item.quantity} paquetes (${PACK_UNITS_120G}u c/u)`
      : `${item.quantity} unidades`
    return `${idx + 1}. ${item.productType} — ${item.fruit}${pres} × ${qtyLabel}`
  })

  const lines = [
    greeting,
    "",
    `Nombre: ${order.nombre}`,
    clientType && profileLabel ? `${clientType}: ${profileLabel}` : null,
    "",
    `${products}:`,
    ...itemLines,
    "",
    confirm,
  ]

  return buildWhatsAppAppUrl(waNumber, buildSharedWhatsAppMessage(lines)) ?? ""
}

function buildItemsTableHtml(items: OrderItem[], resolvePrice: PriceResolver = () => null): string {
  const lookup = resolvePrice
  const rows = items
    .map((item) => {
      const lineTotal = calculateItemLineTotal(item, lookup)
      const qtyLabel = is120gPackPresentation(item.presentation)
        ? `${item.quantity} paq`
        : String(item.quantity)
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;">
            ${escapeHtml(item.productType)} — ${escapeHtml(item.fruit)}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;text-align:center;">
            ${item.presentation ? escapeHtml(item.presentation) : "—"}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;text-align:center;">
            ${qtyLabel}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;text-align:right;">
            ${lineTotal !== null ? formatCOP(lineTotal) : "—"}
          </td>
        </tr>`
    })
    .join("")

  const totals    = calculateOrderTotal(items, resolvePrice)
  const totalUnits = totals.totalUnits

  const totalRow = totals.hasPrice
    ? `<tr>
        <td colspan="3" style="padding:10px 0 0;font-size:14px;font-weight:700;color:#111827;">
          Total estimado
        </td>
        <td style="padding:10px 0 0;font-size:14px;font-weight:700;color:#3f8f46;text-align:right;">
          ${formatCOP(totals.total)}
        </td>
      </tr>`
    : ""

  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="padding:0 0 8px;font-size:12px;color:#9ca3af;text-align:left;text-transform:uppercase;">Producto</th>
          <th style="padding:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;text-transform:uppercase;">Pres.</th>
          <th style="padding:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;text-transform:uppercase;">Cant.</th>
          <th style="padding:0 0 8px;font-size:12px;color:#9ca3af;text-align:right;text-transform:uppercase;">Valor</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:6px 0;font-size:13px;color:#6b7280;">
            Subtotal (${totalUnits} u.)
          </td>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;text-align:right;">
            ${totals.hasPrice ? formatCOP(totals.subtotal) : "—"}
          </td>
        </tr>
        ${totalRow}
      </tfoot>
    </table>
    ${totals.hasPrice ? '<p style="margin:8px 0 0;font-size:11px;color:#6b7280;font-weight:600;">Los valores mostrados ya tienen IVA incluido.</p><p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">* Precio estimado. El equipo confirma el valor final.</p>' : ""}
  `
}

// Email is intentionally in Spanish — server-side, sent to internal team only
export function buildOrderEmailHtml(data: OrderInput, resolvePrice?: PriceResolver): string {
  const nombre   = escapeHtml(data.nombre)
  const email    = data.email           ? escapeHtml(data.email)            : "—"
  const whatsapp = data.whatsapp_number ? escapeHtml(data.whatsapp_number)  : "—"
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#3f8f46,#2f6f36);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">🍋 MÁS CERCA AP</p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Nuevo pedido desde el Asistente</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <span style="display:inline-block;background:#fdf2e2;color:#c97016;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid #f1c78f;">
                🛒 Pedido
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Datos del cliente</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Nombre</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${nombre}</p>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Email</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${email}</p>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">WhatsApp</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${whatsapp}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 8px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">
                Productos solicitados
              </p>
              ${buildItemsTableHtml(data.items, resolvePrice)}
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Pedido enviado desde el Asistente de Pedido —
                <strong style="color:#3f8f46;">${new URL(SITE_CONFIG.siteUrl).hostname}</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
