import { describe, expect, it } from "vitest"
import {
  getProductOptionsForType,
  calculateItemLineTotal,
  calculateOrderTotal,
  getDeliveryBenefit,
  buildWhatsappMessage,
  buildOrderEmailHtml,
} from "./order-assistant"
import type { PriceResolver } from "./order-assistant"
import type { OrderInput } from "@/lib/schemas/order"

// Mock resolver that mirrors the prices previously hardcoded in PRICES_COP / LACTEOS_PRICES.
// Used only in tests — production prices come from Supabase.
const mockResolvePrice: PriceResolver = (fruit, presentation) => {
  if (!presentation) {
    const lacteos: Record<string, number> = {
      "Kumis Del Hato 250ml":  3700,
      "Kumis Yolito 250ml":    3400,
      "Yogurt Del Hato 250ml": 3700,
    }
    return lacteos[fruit] ?? null
  }
  const prices: Record<string, Record<string, number>> = {
    "Maracuyá":         { "120g": 2900, "300g": 4850,  "1000g": 15500 },
    "Mora":             { "120g": 2300, "300g": 4400,  "1000g": 13000 },
    "Mango":            { "120g": 2300, "300g": 4200,  "1000g": 13000 },
    "Lulo":             { "120g": 2300, "300g": 4200,  "1000g": 13000 },
    "Fresa":            { "120g": 2300, "300g": 4200,  "1000g": 13000 },
    "Frutos Rojos":     { "120g": 2300, "300g": 4200,  "1000g": 13000 },
    "Frutos Amarillos": { "120g": 2300, "300g": 4200,  "1000g": 13000 },
  }
  return prices[fruit]?.[presentation] ?? null
}

const baseOrder: OrderInput = {
  nombre:          "Laura Sánchez",
  email:           "laura@example.com",
  whatsapp_number: null,
  consentAccepted: true,
  profile:         "cafeteria",
  items: [
    { productType: "Pulpas", fruit: "Maracuyá", presentation: "1000g", quantity: 10 },
  ],
}

// ──────────────────────────────────────────────
// getProductOptionsForType
// ──────────────────────────────────────────────
describe("getProductOptionsForType", () => {
  it("Pulpas returns fruit list", () => {
    const opts = getProductOptionsForType("Pulpas")
    expect(opts).toContain("Maracuyá")
    expect(opts).toContain("Mora")
  })

  it("Zumos returns zumo products, not pulpa fruits", () => {
    const opts = getProductOptionsForType("Zumos")
    expect(opts).toContain("Limón")
    expect(opts).toContain("Limonada con Cereza")
    expect(opts).toContain("Limonada con Coco")
    expect(opts).toContain("Maracuyá")
    expect(opts).not.toContain("Mora")
    expect(opts).not.toContain("Guayaba")
  })

  it("Lácteos returns dairy products", () => {
    const opts = getProductOptionsForType("Lácteos")
    expect(opts).toContain("Kumis Del Hato 250ml")
    expect(opts).toContain("Kumis Yolito 250ml")
    expect(opts).toContain("Yogurt Del Hato 250ml")
    expect(opts).not.toContain("Maracuyá")
  })

  it("unknown type returns empty array", () => {
    expect(getProductOptionsForType("Desconocido")).toEqual([])
  })
})

// ──────────────────────────────────────────────
// calculateOrderTotal
// ──────────────────────────────────────────────
describe("calculateOrderTotal", () => {
  it("calculates subtotal for 120g using pack-of-10 logic", () => {
    const items = [{ productType: "Pulpas", fruit: "Maracuyá", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items, mockResolvePrice)
    expect(t.subtotal).toBe(2900 * 50)
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(145000)
    expect(t.hasPrice).toBe(true)
  })

  it("keeps net total without volume discount for 20 total units", () => {
    const items = [
      { productType: "Pulpas", fruit: "Maracuyá", presentation: "300g" as const, quantity: 10 },
      { productType: "Pulpas", fruit: "Mora",      presentation: "300g" as const, quantity: 10 },
    ]
    const t = calculateOrderTotal(items, mockResolvePrice)
    const expectedSubtotal = 4850 * 10 + 4400 * 10
    expect(t.subtotal).toBe(expectedSubtotal)
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(expectedSubtotal)
    expect(t.hasPrice).toBe(true)
  })

  it("hasPrice is false when fruit has no price", () => {
    const items = [{ productType: "Lácteos", fruit: "Avena", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items, mockResolvePrice)
    expect(t.hasPrice).toBe(false)
  })

  it("keeps net total without volume discount for 50 packs of 120g", () => {
    const items = [{ productType: "Pulpas", fruit: "Mora", presentation: "120g" as const, quantity: 50 }]
    const t = calculateOrderTotal(items, mockResolvePrice)
    expect(t.subtotal).toBe(2300 * 500)
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(2300 * 500)
  })

  it("returns hasPrice false and zero subtotal when no resolver provided", () => {
    const items = [{ productType: "Pulpas", fruit: "Maracuyá", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items)
    expect(t.hasPrice).toBe(false)
    expect(t.subtotal).toBe(0)
  })
})

describe("calculateItemLineTotal", () => {
  it("uses packs for 120g and units for other presentations", () => {
    const line120 = calculateItemLineTotal(
      { fruit: "Mora", presentation: "120g", quantity: 3 },
      mockResolvePrice
    )
    const line300 = calculateItemLineTotal(
      { fruit: "Mora", presentation: "300g", quantity: 3 },
      mockResolvePrice
    )

    expect(line120).toBe(2300 * 30)
    expect(line300).toBe(4400 * 3)
  })
})

// ──────────────────────────────────────────────
// getDeliveryBenefit
// ──────────────────────────────────────────────
describe("getDeliveryBenefit", () => {
  it("qualifies for free delivery at 60.000 or more", () => {
    const benefit = getDeliveryBenefit(60000)
    expect(benefit.qualifiesFreeDelivery).toBe(true)
    expect(benefit.missingAmount).toBe(0)
  })

  it("returns remaining amount when below threshold", () => {
    const benefit = getDeliveryBenefit(48500)
    expect(benefit.qualifiesFreeDelivery).toBe(false)
    expect(benefit.missingAmount).toBe(11500)
  })
})

// ──────────────────────────────────────────────
// buildWhatsappMessage
// ──────────────────────────────────────────────
describe("buildWhatsappMessage", () => {
  it("returns a wa.me URL for the given number", () => {
    const url = buildWhatsappMessage(baseOrder, "573001234567")
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567/)
  })

  it("message contains client name", () => {
    const url  = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).toContain("Laura Sánchez")
  })

  it("message does not include hidden client profile by default", () => {
    const url  = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).not.toContain("Cafetería / Restaurante")
    expect(text).not.toContain("Tipo de cliente")
  })

  it("message contains fruit and presentation for each item", () => {
    const url  = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).toContain("Maracuyá")
    expect(text).toContain("1000g")
    expect(text).toContain("10 unidades")
  })

  it("message lists all items when order has multiple", () => {
    const multi: OrderInput = {
      ...baseOrder,
      items: [
        { productType: "Pulpas", fruit: "Maracuyá", presentation: "1000g", quantity: 10 },
        { productType: "Pulpas", fruit: "Mora",      presentation: "300g",  quantity: 5  },
      ],
    }
    const text = decodeURIComponent(buildWhatsappMessage(multi, "573001234567").split("?text=")[1] ?? "")
    expect(text).toContain("Maracuyá")
    expect(text).toContain("Mora")
    expect(text).toContain("300g")
  })

  it("MVP message does NOT contain a calculated price in COP", () => {
    const url  = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).not.toContain("COP")
    expect(text).not.toContain("Precio estimado")
    expect(text).not.toMatch(/\$\d/)
  })
})

// ──────────────────────────────────────────────
// buildOrderEmailHtml
// ──────────────────────────────────────────────
describe("buildOrderEmailHtml", () => {
  it("contains client data section", () => {
    const html = buildOrderEmailHtml(baseOrder)
    expect(html).toContain("Datos del cliente")
    expect(html).toContain("Laura Sánchez")
  })

  it("contains products table", () => {
    const html = buildOrderEmailHtml(baseOrder)
    expect(html).toContain("Productos solicitados")
    expect(html).toContain("Maracuyá")
    expect(html).toContain("1000g")
  })

  it("shows all items when order has multiple", () => {
    const multi: OrderInput = {
      ...baseOrder,
      items: [
        { productType: "Pulpas", fruit: "Maracuyá", presentation: "1000g", quantity: 10 },
        { productType: "Pulpas", fruit: "Mora",      presentation: "300g",  quantity: 5  },
      ],
    }
    const html = buildOrderEmailHtml(multi)
    expect(html).toContain("Maracuyá")
    expect(html).toContain("Mora")
  })

  it("escapes HTML characters in user input", () => {
    const malicious: OrderInput = {
      ...baseOrder,
      nombre: '<script>alert("xss")</script>',
      items: [{ productType: "Pulpas", fruit: "Mora &amp; Fresa", presentation: "300g", quantity: 5 }],
    }
    const html = buildOrderEmailHtml(malicious)
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("shows dash for email when null", () => {
    const order: OrderInput = { ...baseOrder, email: null, whatsapp_number: "3001234567" }
    const html = buildOrderEmailHtml(order)
    expect(html).toContain("3001234567")
  })
})
