import { describe, expect, it } from "vitest"
import {
  cupsPerPack,
  packsNeeded,
  freshComparison,
  buildWhatsappMessage,
} from "./yield-calculator"

describe("cupsPerPack", () => {
  it("120g yields 2 cups", () => {
    expect(cupsPerPack("120g")).toBe(2)
  })

  it("300g yields 5 cups", () => {
    expect(cupsPerPack("300g")).toBe(5)
  })

  it("1000g yields 18 cups", () => {
    expect(cupsPerPack("1000g")).toBe(18)
  })
})

describe("packsNeeded", () => {
  it("50 cups with 1000g → 3 packs", () => {
    expect(packsNeeded(50, "1000g")).toBe(3)
  })

  it("18 cups exactly with 1000g → 1 pack (no over-rounding)", () => {
    expect(packsNeeded(18, "1000g")).toBe(1)
  })

  it("19 cups with 1000g → 2 packs", () => {
    expect(packsNeeded(19, "1000g")).toBe(2)
  })

  it("10 cups with 120g → 5 packs", () => {
    // cupsPerPack("120g") = 2, ceil(10/2) = 5
    expect(packsNeeded(10, "120g")).toBe(5)
  })

  it("25 cups with 300g → 5 packs", () => {
    // cupsPerPack("300g") = 5, ceil(25/5) = 5
    expect(packsNeeded(25, "300g")).toBe(5)
  })
})

describe("freshComparison — maracuyá", () => {
  it("3 packs 1000g → freshKg 12 and minutesSaved 720", () => {
    // pulpKg = (3 * 1000) / 1000 = 3 kg
    // freshKg = 3 * 4.0 = 12 kg
    // minutesSaved = 12 * 60 = 720
    const result = freshComparison(3, "1000g", "maracuya")
    expect(result.freshKg).toBe(12)
    expect(result.minutesSaved).toBe(720)
  })

  it("1 pack 300g → correct values", () => {
    // pulpKg = (1 * 300) / 1000 = 0.3 kg
    // freshKg = 0.3 * 4.0 = 1.2 kg
    // minutesSaved = 1.2 * 60 = 72
    const result = freshComparison(1, "300g", "maracuya")
    expect(result.freshKg).toBe(1.2)
    expect(result.minutesSaved).toBe(72)
  })
})

describe("freshComparison — mora", () => {
  it("2 packs 1000g → correct values", () => {
    // pulpKg = 2 kg
    // freshKg = 2 * 2.8 = 5.6 kg
    // minutesSaved = 5.6 * 25 = 140
    const result = freshComparison(2, "1000g", "mora")
    expect(result.freshKg).toBe(5.6)
    expect(result.minutesSaved).toBe(140)
  })
})

describe("freshComparison — mango", () => {
  it("1 pack 1000g → correct values", () => {
    // pulpKg = 1 kg
    // freshKg = 1 * 2.0 = 2 kg
    // minutesSaved = 2 * 20 = 40
    const result = freshComparison(1, "1000g", "mango")
    expect(result.freshKg).toBe(2)
    expect(result.minutesSaved).toBe(40)
  })
})

describe("buildWhatsappMessage", () => {
  it("returns a wa.me URL with encoded message", () => {
    const url = buildWhatsappMessage({
      fruit: "maracuya",
      presentation: "1000g",
      targetCups: 50,
      packsCount: 3,
      whatsappNumber: "573001234567",
    })
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567/)
    expect(url).toContain("Maracu")
    expect(url).toContain("1000g")
    expect(url).toContain("50")
    expect(url).toContain("3")
  })

  it("message contains all required fields", () => {
    const url = buildWhatsappMessage({
      fruit: "mora",
      presentation: "300g",
      targetCups: 100,
      packsCount: 20,
      whatsappNumber: "573009876543",
    })
    const decoded = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(decoded).toContain("Mora")
    expect(decoded).toContain("300g")
    expect(decoded).toContain("100 vasos")
    expect(decoded).toContain("20 paquete")
  })
})
