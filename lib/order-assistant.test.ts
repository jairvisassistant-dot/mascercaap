import { describe, expect, it } from "vitest"
import {
  getProductOptionsForProfile,
  buildWhatsappMessage,
  buildOrderEmailHtml,
} from "./order-assistant"
import type { OrderInput } from "@/lib/schemas/order"

const baseOrder: OrderInput = {
  nombre: "Laura Sánchez",
  email: "laura@example.com",
  whatsapp_number: null,
  consentAccepted: true,
  profile: "cafeteria",
  productType: "Pulpas",
  fruit: "Maracuyá",
  presentation: "1000g",
  quantity: 10,
  zone: "bogota",
  urgency: "manana",
}

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

describe("buildWhatsappMessage", () => {
  it("returns a wa.me URL for the given number", () => {
    const url = buildWhatsappMessage(baseOrder, "573001234567")
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567/)
  })

  it("message contains client name", () => {
    const url = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).toContain("Laura Sánchez")
  })

  it("message contains profile label", () => {
    const url = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).toContain("Cafetería / Restaurante")
  })

  it("message contains fruit and presentation", () => {
    const url = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).toContain("Maracuyá")
    expect(text).toContain("1000g")
    expect(text).toContain("10 unidades")
  })

  it("MVP message does NOT contain a calculated price in COP", () => {
    const url = buildWhatsappMessage(baseOrder, "573001234567")
    const text = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(text).not.toContain("COP")
    expect(text).not.toContain("Precio estimado")
    expect(text).not.toMatch(/\$\d/)
  })
})

describe("buildOrderEmailHtml", () => {
  it("contains client data section", () => {
    const html = buildOrderEmailHtml(baseOrder)
    expect(html).toContain("Datos del cliente")
    expect(html).toContain("Laura Sánchez")
  })

  it("contains order detail section", () => {
    const html = buildOrderEmailHtml(baseOrder)
    expect(html).toContain("Detalle del pedido")
    expect(html).toContain("Maracuyá")
    expect(html).toContain("1000g")
    expect(html).toContain("10 unidades")
  })

  it("escapes HTML characters in user input", () => {
    const malicious: OrderInput = {
      ...baseOrder,
      nombre: '<script>alert("xss")</script>',
      fruit: "Mora & Fresa",
    }
    const html = buildOrderEmailHtml(malicious)
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("Mora &amp; Fresa")
  })

  it("shows dashes when email and whatsapp are absent", () => {
    const order: OrderInput = { ...baseOrder, email: null, whatsapp_number: "3001234567" }
    const html = buildOrderEmailHtml(order)
    expect(html).toContain("3001234567")
  })
})
