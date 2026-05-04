import { describe, expect, it } from "vitest"
import { orderSchema } from "./order"

const base = {
  nombre: "Juan García",
  email: "juan@example.com",
  whatsapp_number: null,
  consentAccepted: true as const,
  profile: "cafeteria" as const,
  productType: "Pulpas",
  fruit: "Maracuyá",
  presentation: "1000g" as const,
  quantity: 10,
  zone: "bogota" as const,
  urgency: "manana" as const,
}

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

  it("accepts quantity 1 (min boundary)", () => {
    expect(orderSchema.safeParse({ ...base, quantity: 1 }).success).toBe(true)
  })

  it("accepts quantity 9999 (max boundary)", () => {
    expect(orderSchema.safeParse({ ...base, quantity: 9999 }).success).toBe(true)
  })
})

describe("orderSchema — invalid payloads", () => {
  it("fails when both email and whatsapp_number are null", () => {
    const input = { ...base, email: null, whatsapp_number: null }
    const result = orderSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("fails when consentAccepted is false", () => {
    const input = { ...base, consentAccepted: false }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails with invalid email", () => {
    const input = { ...base, email: "not-an-email" }
    expect(orderSchema.safeParse(input).success).toBe(false)
  })

  it("fails with quantity 0", () => {
    expect(orderSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false)
  })

  it("fails with quantity 10000 (over max)", () => {
    expect(orderSchema.safeParse({ ...base, quantity: 10000 }).success).toBe(false)
  })

  it("fails with invalid presentation", () => {
    const input = { ...base, presentation: "500g" }
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
