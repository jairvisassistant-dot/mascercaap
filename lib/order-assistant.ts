import type { OrderInput } from "@/lib/schemas/order"

export type ClientProfile = "hogar" | "cafeteria" | "evento" | "distribucion"
export type DeliveryZone   = "bogota" | "medellin" | "cali" | "otra"
export type Urgency        = "hoy" | "manana" | "semana" | "sin_urgencia"

export const PRODUCT_OPTIONS_BY_PROFILE: Record<ClientProfile, string[]> = {
  hogar:        ["Pulpas", "Zumos"],
  cafeteria:    ["Pulpas", "Zumos", "Lácteos"],
  evento:       ["Pulpas", "Zumos"],
  distribucion: ["Pulpas", "Zumos", "Lácteos"],
}

export const FRUIT_OPTIONS = [
  "Maracuyá",
  "Mora",
  "Mango",
  "Lulo",
  "Guanábana",
  "Fresa",
  "Piña",
  "Tomate de árbol",
]

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

export function getProductOptionsForProfile(profile: ClientProfile): string[] {
  return PRODUCT_OPTIONS_BY_PROFILE[profile]
}

export function buildWhatsappMessage(order: OrderInput, waNumber: string): string {
  const lines = [
    "Hola, quiero hacer un pedido:",
    "",
    `Nombre: ${order.nombre}`,
    `Tipo de cliente: ${PROFILE_LABELS[order.profile]}`,
    `Producto: ${order.productType} — ${order.fruit}`,
    `Presentación: ${order.presentation}`,
    `Cantidad: ${order.quantity} unidades`,
    `Zona de entrega: ${ZONE_LABELS[order.zone]}`,
    `Urgencia: ${URGENCY_LABELS[order.urgency]}`,
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

export function buildOrderEmailHtml(data: OrderInput): string {
  const nombre      = escapeHtml(data.nombre)
  const email       = data.email       ? escapeHtml(data.email)            : "—"
  const whatsapp    = data.whatsapp_number ? escapeHtml(data.whatsapp_number) : "—"
  const profile     = escapeHtml(PROFILE_LABELS[data.profile])
  const productType = escapeHtml(data.productType)
  const fruit       = escapeHtml(data.fruit)
  const zone        = escapeHtml(ZONE_LABELS[data.zone])
  const urgency     = escapeHtml(URGENCY_LABELS[data.urgency])

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
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">WhatsApp</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${whatsapp}</p>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Zona</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${zone}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 32px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Detalle del pedido</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Tipo de producto</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${productType}</p>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Fruta</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111827;">${fruit}</p>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Presentación / Cantidad</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${escapeHtml(data.presentation)} × ${data.quantity} unidades</p>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;">Urgencia</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#111827;">${urgency}</p>
                </td></tr>
              </table>
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
