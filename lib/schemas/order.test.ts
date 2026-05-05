import { describe, expect, it } from "vitest"
import { orderSchema, orderItemSchema } from "./order"

const baseItem = {
  productType:  "Pulpas",
  fruit:        "Maracuyá",
  presentation: "1000g" as const,
  quantity:     10,
}

const base = {
  nombre:          "Juan García",
  email:           "juan@example.com",
  whatsapp_number: null,
  consentAccepted: true as const,
  profile:         "cafeteria" as const,
  items:           [baseItem],
}

describe("orderItemSchema", () => {
  it("accepts valid item with presentation", () => {
    expect(orderItemSchema.safeParse(baseItem).success).toBe(true)
  })

  it("accepts Lácteos item with null presentation", () => {
    const lacteos = { productType: "Lácteos", fruit: "Kumis Del Hato 250ml", presentation: null, quantity: 6 }
    expect(orderItemSchema.safeParse(lacteos).success).toBe(true)
  })

  it("fails with quantity 0", () => {
    expect(orderItemSchema.safeParse({ ...baseItem, quantity: 0 }).success).toBe(false)
  })

  it("fails with quantity 10000 (over max)", () => {
    expect(orderItemSchema.safeParse({ ...baseItem, quantity: 10000 }).success).toBe(false)
  })

  it("accepts Zumos presentation in ml", () => {
    const item = { productType: "Zumos", fruit: "Limón", presentation: "600ml", quantity: 5 }
    expect(orderItemSchema.safeParse(item).success).toBe(true)
  })

  it("accepts 1L presentation for Zumos", () => {
    const item = { productType: "Zumos", fruit: "Limonada con Cereza", presentation: "1L", quantity: 3 }
    expect(orderItemSchema.safeParse(item).success).toBe(true)
  })

  it("fails with empty presentation string", () => {
    expect(orderItemSchema.safeParse({ ...baseItem, presentation: "" }).success).toBe(false)
  })

  it("fails with presentation string over 20 chars", () => {
    expect(orderItemSchema.safeParse({ ...baseItem, presentation: "a".repeat(21) }).success).toBe(false)
  })
})

describe("orderSchema — valid payloads", () => {
  it("accepts payload with email only", () => {
    expect(orderSchema.safeParse(base).success).toBe(true)
  })

  it("accepts payload with whatsapp_number only", () => {
    const input = { ...base, email: null, whatsapp_number: "3201234567" }
    expect(orderSchema.safeParse(input).success).toBe(true)
  })

  it("accepts payload with both email and whatsapp_number", () => {
    const input = { ...base, whatsapp_number: "3201234567" }
    expect(orderSchema.safeParse(input).success).toBe(true)
  })

  it("accepts multiple items", () => {
    const input = {
      ...base,
      items: [
        baseItem,
        { productType: "Pulpas", fruit: "Mora", presentation: "300g" as const, quantity: 5 },
      ],
    }
    expect(orderSchema.safeParse(input).success).toBe(true)
  })

  it("accepts quantity 1 (min boundary in item)", () => {
    const input = { ...base, items: [{ ...baseItem, quantity: 1 }] }
    expect(orderSchema.safeParse(input).success).toBe(true)
  })

  it("accepts quantity 9999 (max boundary in item)", () => {
    const input = { ...base, items: [{ ...baseItem, quantity: 9999 }] }
    expect(orderSchema.safeParse(input).success).toBe(true)
  })
})

describe("orderSchema — invalid payloads", () => {
  it("fails when items array is empty", () => {
    const input = { ...base, items: [] }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails when items has more than 20 entries", () => {
    const manyItems = Array.from({ length: 21 }, () => baseItem)
    const input = { ...base, items: manyItems }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails when both email and whatsapp_number are null", () => {
    const input = { ...base, email: null, whatsapp_number: null }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails when consentAccepted is false", () => {
    const input = { ...base, consentAccepted: false }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails with invalid email", () => {
    const input = { ...base, email: "not-an-email" }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails with invalid profile", () => {
    const input = { ...base, profile: "empresa" }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails with nombre shorter than 2 chars", () => {
    expect(orderSchema.safeParse({ ...base, nombre: "A" }).success).toBe(false)
  })
})
