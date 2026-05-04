import { describe, expect, it } from "vitest"
import {
  getProductOptionsForProfile,
  getUnitPrice,
  getDiscountRate,
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
// getProductOptionsForProfile
// ──────────────────────────────────────────────
describe("getProductOptionsForProfile", () => {
  it("hogar does not include Lácteos", () => {
    const opts = getProductOptionsForProfile("hogar")
    expect(opts).not.toContain("Lácteos")
    expect(opts).toContain("Pulpas")
    expect(opts).toContain("Zumos")
  })

  it("cafeteria includes Lácteos", () => {
    expect(getProductOptionsForProfile("cafeteria")).toContain("Lácteos")
  })

  it("evento does not include Lácteos", () => {
    expect(getProductOptionsForProfile("evento")).not.toContain("Lácteos")
  })

  it("distribucion includes Lácteos", () => {
    expect(getProductOptionsForProfile("distribucion")).toContain("Lácteos")
  })
})

// ──────────────────────────────────────────────
// getUnitPrice
// ──────────────────────────────────────────────
describe("getUnitPrice", () => {
  it("returns correct price for Maracuyá 120g", () => {
    expect(getUnitPrice("Maracuyá", "120g")).toBe(2800)
  })

  it("returns correct price for Mora 1000g", () => {
    expect(getUnitPrice("Mora", "1000g")).toBe(21000)
  })

  it("returns null for unknown fruit", () => {
    expect(getUnitPrice("Corozo", "120g")).toBeNull()
  })

  it("returns null for unknown presentation", () => {
    expect(getUnitPrice("Maracuyá", "500g")).toBeNull()
  })
})

// ──────────────────────────────────────────────
// getDiscountRate
// ──────────────────────────────────────────────
describe("getDiscountRate", () => {
  it("0% for 1 unit", ()   => expect(getDiscountRate(1)).toBe(0))
  it("0% for 9 units", ()  => expect(getDiscountRate(9)).toBe(0))
  it("5% for 10 units", () => expect(getDiscountRate(10)).toBe(0.05))
  it("5% for 19 units", () => expect(getDiscountRate(19)).toBe(0.05))
  it("10% for 20 units", ()=> expect(getDiscountRate(20)).toBe(0.10))
  it("10% for 49 units", ()=> expect(getDiscountRate(49)).toBe(0.10))
  it("15% for 50 units", ()=> expect(getDiscountRate(50)).toBe(0.15))
  it("15% for 100 units",()=> expect(getDiscountRate(100)).toBe(0.15))
})

// ──────────────────────────────────────────────
// calculateOrderTotal
// ──────────────────────────────────────────────
describe("calculateOrderTotal", () => {
  it("calculates subtotal and no discount for < 10 units", () => {
    const items = [{ productType: "Pulpas", fruit: "Maracuyá", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items)
    expect(t.subtotal).toBe(2800 * 5)   // 14000
    expect(t.discountRate).toBe(0)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(14000)
    expect(t.hasPrice).toBe(true)
  })

  it("applies 10% discount for 20 total units across items", () => {
    const items = [
      { productType: "Pulpas", fruit: "Maracuyá", presentation: "300g" as const, quantity: 10 },
      { productType: "Pulpas", fruit: "Mora",      presentation: "300g" as const, quantity: 10 },
    ]
    const t = calculateOrderTotal(items)
    const expectedSubtotal = 6800 * 10 + 7400 * 10  // 68000 + 74000 = 142000
    expect(t.subtotal).toBe(expectedSubtotal)
    expect(t.discountRate).toBe(0.10)
    expect(t.discount).toBe(Math.round(expectedSubtotal * 0.10))
    expect(t.total).toBe(expectedSubtotal - Math.round(expectedSubtotal * 0.10))
    expect(t.hasPrice).toBe(true)
  })

  it("hasPrice is false when fruit has no price", () => {
    const items = [{ productType: "Lácteos", fruit: "Avena", presentation: "120g" as const, quantity: 5 }]
    const t = calculateOrderTotal(items)
    expect(t.hasPrice).toBe(false)
  })

  it("applies 15% discount for 50+ units", () => {
    const items = [{ productType: "Pulpas", fruit: "Piña", presentation: "120g" as const, quantity: 50 }]
    const t = calculateOrderTotal(items)
    expect(t.discountRate).toBe(0.15)
    expect(t.discount).toBe(Math.round(2400 * 50 * 0.15))
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

  it("message contains profile label", () => {
    const url  = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).toContain("Cafetería / Restaurante")
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
