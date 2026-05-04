import { describe, expect, it } from "vitest"
import {
  cupsPerPack,
  packsNeeded,
  freshComparison,
  buildWhatsappMessage,
} from "./yield-calculator"

// Fuente: Alimentos SAS Colombia — 100g pulpa → 400ml jugo → 88.75g/355ml (12oz) ≈ 90g
// Fuente: industria smoothie bars — ~45% fruta por volumen × densidad 1.07 g/ml ≈ 150g/12oz

describe("cupsPerPack — jugo (90g/cup)", () => {
  it("120g → 1 cup", () => {
    expect(cupsPerPack("120g", "jugo")).toBe(1)  // floor(120/90) = 1
  })
  it("300g → 3 cups", () => {
    expect(cupsPerPack("300g", "jugo")).toBe(3)  // floor(300/90) = 3
  })
  it("1000g → 11 cups", () => {
    expect(cupsPerPack("1000g", "jugo")).toBe(11) // floor(1000/90) = 11
  })
})

describe("cupsPerPack — frappe (150g/cup)", () => {
  it("120g → 1 cup (mínimo garantizado)", () => {
    expect(cupsPerPack("120g", "frappe")).toBe(1) // floor(120/150) = 0 → cap a 1
  })
  it("300g → 2 cups", () => {
    expect(cupsPerPack("300g", "frappe")).toBe(2) // floor(300/150) = 2
  })
  it("1000g → 6 cups", () => {
    expect(cupsPerPack("1000g", "frappe")).toBe(6) // floor(1000/150) = 6
  })
})

describe("packsNeeded — jugo", () => {
  it("50 cups with 1000g → 5 packs", () => {
    expect(packsNeeded(50, "1000g", "jugo")).toBe(5) // ceil(50/11) = 5
  })
  it("11 cups exactly with 1000g → 1 pack (no over-rounding)", () => {
    expect(packsNeeded(11, "1000g", "jugo")).toBe(1) // ceil(11/11) = 1
  })
  it("12 cups with 1000g → 2 packs", () => {
    expect(packsNeeded(12, "1000g", "jugo")).toBe(2) // ceil(12/11) = 2
  })
  it("10 cups with 120g → 10 packs", () => {
    expect(packsNeeded(10, "120g", "jugo")).toBe(10) // cupsPerPack=1, ceil(10/1) = 10
  })
  it("9 cups with 300g → 3 packs", () => {
    expect(packsNeeded(9, "300g", "jugo")).toBe(3)  // ceil(9/3) = 3
  })
})

describe("packsNeeded — frappe", () => {
  it("12 cups with 1000g → 2 packs", () => {
    expect(packsNeeded(12, "1000g", "frappe")).toBe(2) // ceil(12/6) = 2
  })
  it("6 cups exactly with 1000g → 1 pack (no over-rounding)", () => {
    expect(packsNeeded(6, "1000g", "frappe")).toBe(1) // ceil(6/6) = 1
  })
  it("4 cups with 300g → 2 packs", () => {
    expect(packsNeeded(4, "300g", "frappe")).toBe(2) // ceil(4/2) = 2
  })
  it("2 cups with 300g → 1 pack", () => {
    expect(packsNeeded(2, "300g", "frappe")).toBe(1) // ceil(2/2) = 1
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
    // pulpKg = 0.3 kg
    // freshKg = 0.3 * 4.0 = 1.2 kg
    // minutesSaved = 1.2 * 60 = 72
    const result = freshComparison(1, "300g", "maracuya")
    expect(result.freshKg).toBe(1.2)
    expect(result.minutesSaved).toBe(72)
  })
})

describe("freshComparison — mora", () => {
  it("2 packs 1000g → correct values", () => {
    // pulpKg = 2 kg | freshKg = 2 * 2.8 = 5.6 | minutesSaved = 5.6 * 25 = 140
    const result = freshComparison(2, "1000g", "mora")
    expect(result.freshKg).toBe(5.6)
    expect(result.minutesSaved).toBe(140)
  })
})

describe("freshComparison — mango", () => {
  it("1 pack 1000g → correct values", () => {
    // pulpKg = 1 | freshKg = 2 | minutesSaved = 40
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
      packsCount: 5,
      whatsappNumber: "573001234567",
      prepType: "jugo",
    })
    expect(url).toMatch(/^https:\/\/wa\.me\/573001234567/)
    expect(url).toContain("Maracu")
    expect(url).toContain("1000g")
    expect(url).toContain("50")
    expect(url).toContain("5")
  })

  it("message contains all required fields", () => {
    const url = buildWhatsappMessage({
      fruit: "mora",
      presentation: "300g",
      targetCups: 100,
      packsCount: 34,
      whatsappNumber: "573009876543",
      prepType: "frappe",
    })
    const decoded = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(decoded).toContain("Mora")
    expect(decoded).toContain("300g")
    expect(decoded).toContain("100 vasos")
    expect(decoded).toContain("34 paquete")
  })

  it("message includes prep type for jugo", () => {
    const url = buildWhatsappMessage({
      fruit: "lulo",
      presentation: "300g",
      targetCups: 25,
      packsCount: 9,
      whatsappNumber: "573001234567",
      prepType: "jugo",
    })
    const decoded = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(decoded).toContain("Jugo")
  })

  it("message includes prep type for frappe", () => {
    const url = buildWhatsappMessage({
      fruit: "fresa",
      presentation: "1000g",
      targetCups: 50,
      packsCount: 9,
      whatsappNumber: "573001234567",
      prepType: "frappe",
    })
    const decoded = decodeURIComponent(url.split("?text=")[1] ?? "")
    expect(decoded).toContain("Frappe")
  })
})
