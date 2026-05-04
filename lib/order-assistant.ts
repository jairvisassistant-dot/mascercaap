import type { OrderInput, OrderItem } from "@/lib/schemas/order"

export type ClientProfile = "hogar" | "cafeteria" | "evento" | "distribucion"
export type DeliveryZone   = "bogota" | "medellin" | "cali" | "otra"
export type Urgency        = "hoy" | "manana" | "semana" | "sin_urgencia"

export const PRODUCT_OPTIONS_BY_PROFILE: Record<ClientProfile, string[]> = {
  hogar:        ["Pulpas", "Zumos", "Lácteos"],
  cafeteria:    ["Pulpas", "Zumos", "Lácteos"],
  evento:       ["Pulpas", "Zumos", "Lácteos"],
  distribucion: ["Pulpas", "Zumos", "Lácteos"],
}

export const PULPA_FRUITS = [
  "Maracuyá",
  "Mora",
  "Mango",
  "Lulo",
  "Guanábana",
  "Fresa",
  "Guayaba",
  "Frutos Rojos",
  "Tomate de árbol",
]

export const ZUMOS_PRODUCTS = [
  "Limón",
  "Limonada con Cereza",
  "Limonada con Coco",
  "Maracuyá",
]

export const PRODUCT_OPTIONS_BY_TYPE: Record<string, string[]> = {
  "Pulpas": PULPA_FRUITS,
  "Zumos":  ZUMOS_PRODUCTS,
  "Lácteos": [
    "Kumis Del Hato 250ml",
    "Kumis Yolito 900ml",
    "Yogurt Del Hato 250ml",
  ],
}

export function getProductOptionsForType(productType: string): string[] {
  return PRODUCT_OPTIONS_BY_TYPE[productType] ?? []
}

export const PULPA_PRESENTATIONS = ["120g", "300g", "1000g"] as const

export const ZUMOS_PRESENTATIONS: Record<string, string[]> = {
  "Limón":               ["600ml", "1L", "2L", "5L"],
  "Limonada con Cereza": ["350ml", "1L", "2L"],
  "Limonada con Coco":   ["350ml", "1L", "2L"],
  "Maracuyá":            ["350ml", "1L", "2L"],
}

export function getPresentationsForProduct(productType: string, fruit: string): string[] {
  if (productType === "Zumos") return ZUMOS_PRESENTATIONS[fruit] ?? []
  return [...PULPA_PRESENTATIONS]
}

export const QUANTITY_OPTIONS = [5, 10, 20, 50] as const

export const ZONE_LABELS: Record<DeliveryZone, string> = {
  bogota:    "Bogotá",
  medellin:  "Medellín",
  cali:      "Cali",
  otra:      "Otra ciudad",
}

export const URGENCY_LABELS: Record<Urgency, string> = {
  hoy:          "Hoy",
  manana:       "Mañana",
  semana:       "Esta semana",
  sin_urgencia: "Sin urgencia",
}

export const PROFILE_LABELS: Record<ClientProfile, string> = {
  hogar:        "Hogar",
  cafeteria:    "Cafetería / Restaurante",
  evento:       "Evento",
  distribucion: "Distribución",
}

// Precios COP por fruta y presentación (pulpas de fruta congelada)
// Valores provisorios — actualizar en Sanity Studio cuando esté disponible
export const PRICES_COP: Record<string, Record<string, number>> = {
  "Maracuyá":         { "120g": 2800,  "300g": 6800,  "1000g": 19500, "350ml": 3500, "1L": 7500, "2L": 13000 },
  "Mora":             { "120g": 3200,  "300g": 7400,  "1000g": 21000 },
  "Mango":            { "120g": 2600,  "300g": 6200,  "1000g": 17500 },
  "Lulo":             { "120g": 3000,  "300g": 7000,  "1000g": 20000 },
  "Guanábana":        { "120g": 3800,  "300g": 8800,  "1000g": 24500 },
  "Fresa":            { "120g": 2900,  "300g": 6600,  "1000g": 18500 },
  "Guayaba":          { "120g": 2700,  "300g": 6300,  "1000g": 17800 },
  "Frutos Rojos":     { "120g": 3500,  "300g": 8000,  "1000g": 22500 },
  "Tomate de árbol":  { "120g": 2800,  "300g": 6500,  "1000g": 18000 },
  // Zumos — precios provisorios, actualizar en Sanity
  "Limón":               { "600ml": 4500,  "1L": 7000,  "2L": 12000, "5L": 25000 },
  "Limonada con Cereza": { "350ml": 3500,  "1L": 7500,  "2L": 13000 },
  "Limonada con Coco":   { "350ml": 3500,  "1L": 7500,  "2L": 13000 },
}

export function getProductOptionsForProfile(profile: ClientProfile): string[] {
  return PRODUCT_OPTIONS_BY_PROFILE[profile]
}

export function getUnitPrice(fruit: string, presentation: string | null | undefined): number | null {
  if (!presentation) return null
  return PRICES_COP[fruit]?.[presentation] ?? null
}

export function getDiscountRate(totalUnits: number): number {
  if (totalUnits >= 50) return 0.15
  if (totalUnits >= 20) return 0.10
  if (totalUnits >= 10) return 0.05
  return 0
}

export type OrderTotals = {
  subtotal:     number
  totalUnits:   number
  discountRate: number
  discount:     number
  total:        number
  hasPrice:     boolean
}

export function calculateOrderTotal(items: OrderItem[]): OrderTotals {
  const totalUnits  = items.reduce((sum, item) => sum + item.quantity, 0)
  const discountRate = getDiscountRate(totalUnits)
  let subtotal  = 0
  let hasPrice  = items.length > 0

  for (const item of items) {
    const price = getUnitPrice(item.fruit, item.presentation)
    if (price === null) { hasPrice = false; continue }
    subtotal += price * item.quantity
  }

  const discount = Math.round(subtotal * discountRate)
  return { subtotal, totalUnits, discountRate, discount, total: subtotal - discount, hasPrice }
}

export function formatCOP(n: number): string {
  return `$${n.toLocaleString("es-CO")}`
}

export function buildWhatsappMessage(order: OrderInput, waNumber: string): string {
  const itemLines = order.items.map((item, i) => {
    const pres = item.presentation ? ` ${item.presentation}` : ""
    return `${i + 1}. ${item.productType} — ${item.fruit}${pres} × ${item.quantity} unidades`
  })

  const lines = [
    "Hola, quiero hacer un pedido:",
    "",
    `Nombre: ${order.nombre}`,
    `Tipo de cliente: ${PROFILE_LABELS[order.profile]}`,
    "",
    "Productos:",
    ...itemLines,
    "",
    "¿Me confirman disponibilidad y precio?",
  ]
  const text = lines.join("\n")
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function buildItemsTableHtml(items: OrderItem[]): string {
  const rows = items
    .map((item) => {
      const price     = getUnitPrice(item.fruit, item.presentation)
      const lineTotal = price !== null ? formatCOP(price * item.quantity) : "—"
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;">
            ${escapeHtml(item.productType)} — ${escapeHtml(item.fruit)}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;text-align:center;">
            ${item.presentation ? escapeHtml(item.presentation) : "—"}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;text-align:center;">
            ${item.quantity}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111827;text-align:right;">
            ${lineTotal}
          </td>
        </tr>`
    })
    .join("")

  const totals    = calculateOrderTotal(items)
  const totalUnits = totals.totalUnits

  const discountRow =
    totals.hasPrice && totals.discountRate > 0
      ? `<tr>
          <td colspan="3" style="padding:6px 0;font-size:13px;color:#3f8f46;">
            Descuento volumen (${(totals.discountRate * 100).toFixed(0)}%)
          </td>
          <td style="padding:6px 0;font-size:13px;color:#3f8f46;text-align:right;">
            −${formatCOP(totals.discount)}
          </td>
        </tr>`
      : ""

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
        ${discountRow}
        ${totalRow}
      </tfoot>
    </table>
    ${totals.hasPrice ? '<p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">* Precio estimado. El equipo confirma el valor final.</p>' : ""}
  `
}

export function buildOrderEmailHtml(data: OrderInput): string {
  const nombre   = escapeHtml(data.nombre)
  const email    = data.email           ? escapeHtml(data.email)            : "—"
  const whatsapp = data.whatsapp_number ? escapeHtml(data.whatsapp_number)  : "—"
  const profile  = escapeHtml(PROFILE_LABELS[data.profile])

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
                🛒 Pedido — ${profile}
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
              ${buildItemsTableHtml(data.items)}
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Pedido enviado desde el Asistente de Pedido —
                <strong style="color:#3f8f46;">mascercap.com</strong>
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
