import { describe, expect, it } from "vitest"
import {
  cupsPerPack,
  packsNeeded,
  totalCupsFromPacks,
  freshComparison,
} from "./yield-calculator"

// jugo:   120g/16oz (dato del productor)
// frappe: 150g/16oz (más pulpa por menor dilución con leche/hielo)
// packsNeeded usa fórmula directa: ceil(cups × g_por_vaso / g_por_pack)

describe("cupsPerPack — jugo (120g/cup)", () => {
  it("120g → 1 cup", () => {
    expect(cupsPerPack("120g", "jugo")).toBe(1)  // floor(120/120) = 1
  })
  it("300g → 2 cups", () => {
    expect(cupsPerPack("300g", "jugo")).toBe(2)  // floor(300/120) = 2
  })
  it("1000g → 8 cups", () => {
    expect(cupsPerPack("1000g", "jugo")).toBe(8) // floor(1000/120) = 8
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

describe("packsNeeded — jugo (fórmula directa)", () => {
  it("50 cups with 1000g → 6 packs", () => {
    expect(packsNeeded(50, "1000g", "jugo")).toBe(6) // ceil(50×120/1000) = ceil(6) = 6
  })
  it("8 cups exactly with 1000g → 1 pack (sin sobre-redondeo)", () => {
    expect(packsNeeded(8, "1000g", "jugo")).toBe(1)  // ceil(8×120/1000) = ceil(0.96) = 1
  })
  it("9 cups with 1000g → 2 packs", () => {
    expect(packsNeeded(9, "1000g", "jugo")).toBe(2)  // ceil(9×120/1000) = ceil(1.08) = 2
  })
  it("10 cups with 120g → 10 packs", () => {
    expect(packsNeeded(10, "120g", "jugo")).toBe(10) // ceil(10×120/120) = 10
  })
  it("9 cups with 300g → 4 packs", () => {
    expect(packsNeeded(9, "300g", "jugo")).toBe(4)   // ceil(9×120/300) = ceil(3.6) = 4
  })
})

describe("packsNeeded — frappe (fórmula directa)", () => {
  it("12 cups with 1000g → 2 packs", () => {
    expect(packsNeeded(12, "1000g", "frappe")).toBe(2) // ceil(12×150/1000) = ceil(1.8) = 2
  })
  it("5 cups with 1000g → 1 pack", () => {
    expect(packsNeeded(5, "1000g", "frappe")).toBe(1)  // ceil(5×150/1000) = ceil(0.75) = 1
  })
  it("4 cups with 300g → 2 packs", () => {
    expect(packsNeeded(4, "300g", "frappe")).toBe(2)   // ceil(4×150/300) = ceil(2) = 2
  })
  it("2 cups with 300g → 1 pack", () => {
    expect(packsNeeded(2, "300g", "frappe")).toBe(1)   // ceil(2×150/300) = ceil(1) = 1
  })
})

describe("totalCupsFromPacks", () => {
  it("4 packs 300g jugo → 10 cups", () => {
    expect(totalCupsFromPacks(4, "300g", "jugo")).toBe(10) // floor(4×300/120) = floor(10) = 10
  })
  it("6 packs 1000g jugo → 50 cups", () => {
    expect(totalCupsFromPacks(6, "1000g", "jugo")).toBe(50) // floor(6×1000/120) = floor(50) = 50
  })
  it("2 packs 1000g frappe → 13 cups", () => {
    expect(totalCupsFromPacks(2, "1000g", "frappe")).toBe(13) // floor(2×1000/150) = floor(13.33) = 13
  })
  it("1 pack 120g frappe → 0 cups → no, min 0 raw (display handled upstream)", () => {
    expect(totalCupsFromPacks(1, "120g", "frappe")).toBe(0) // floor(120/150) = 0
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
    // pulpKg = 2 kg | freshKg = 2 * 2.8 = 5.6
    // mora solo se lava (sin cáscara ni pepas grandes) → 12 min/kg
    // minutesSaved = round(5.6 * 12) = round(67.2) = 67
    const result = freshComparison(2, "1000g", "mora")
    expect(result.freshKg).toBe(5.6)
    expect(result.minutesSaved).toBe(67)
  })
})

describe("freshComparison — mango", () => {
  it("1 pack 1000g → correct values", () => {
    // pulpKg = 1 | freshKg = 2
    // mango lleva cáscara + pepa grande → 45 min/kg
    // minutesSaved = 2 * 45 = 90
    const result = freshComparison(1, "1000g", "mango")
    expect(result.freshKg).toBe(2)
    expect(result.minutesSaved).toBe(90)
  })
})


