import { describe, expect, it } from "vitest"
import {
  getProductOptionsForType,
  getUnitPrice,
  calculateOrderTotal,
  buildWhatsappMessage,
  buildOrderEmailHtml,
} from "./order-assistant"
import type { OrderInput } from "@/lib/schemas/order"

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
// getUnitPrice
// ──────────────────────────────────────────────
describe("getUnitPrice", () => {
  it("returns correct price for Maracuyá 120g", () => {
    expect(getUnitPrice("Maracuyá", "120g")).toBe(2900)
  })

  it("returns correct price for Mora 1000g", () => {
    expect(getUnitPrice("Mora", "1000g")).toBe(13000)
  })

  it("returns null for unknown fruit", () => {
    expect(getUnitPrice("Corozo", "120g")).toBeNull()
  })

  it("returns null for unknown presentation", () => {
    expect(getUnitPrice("Maracuyá", "500g")).toBeNull()
  })

  it("returns price for Lácteos product when presentation is null", () => {
    expect(getUnitPrice("Kumis Del Hato 250ml", null)).toBeGreaterThan(0)
  })

  it("returns null for unknown Lácteos product with null presentation", () => {
    expect(getUnitPrice("Avena Desconocida", null)).toBeNull()
  })
})

// ──────────────────────────────────────────────
// calculateOrderTotal
// ──────────────────────────────────────────────
describe("calculateOrderTotal", () => {
  it("calculates subtotal and no discount for < 10 units", () => {
    const items = [{ productType: "Pulpas", fruit: "Maracuyá", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items)
    expect(t.subtotal).toBe(2900 * 5)   // 14500
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(14500)
    expect(t.hasPrice).toBe(true)
  })

  it("keeps net total without volume discount for 20 total units", () => {
    const items = [
      { productType: "Pulpas", fruit: "Maracuyá", presentation: "300g" as const, quantity: 10 },
      { productType: "Pulpas", fruit: "Mora",      presentation: "300g" as const, quantity: 10 },
    ]
    const t = calculateOrderTotal(items)
    const expectedSubtotal = 4850 * 10 + 4400 * 10  // 48500 + 44000 = 92500
    expect(t.subtotal).toBe(expectedSubtotal)
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(expectedSubtotal)
    expect(t.hasPrice).toBe(true)
  })

  it("hasPrice is false when fruit has no price", () => {
    const items = [{ productType: "Lácteos", fruit: "Avena", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items)
    expect(t.hasPrice).toBe(false)
  })

  it("keeps net total without volume discount for 50+ units", () => {
    const items = [{ productType: "Pulpas", fruit: "Mora", presentation: "120g" as const, quantity: 50 }]
    const t = calculateOrderTotal(items)
    expect(t.subtotal).toBe(2300 * 50)  // 115000
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(2300 * 50)
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
