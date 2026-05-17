import type { ProductLineConfig, ProductLineKey } from "@/types"

export const PULPA_KEYS = new Set<ProductLineKey>([
  "pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango",
  "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba",
  "pulpa-frutos-rojos", "pulpa-frutos-amarillos", "pulpa-tomate-arbol",
])

export type RenderSegment =
  | { type: "regular"; line: ProductLineConfig }
  | { type: "pulpa"; lines: ProductLineConfig[] }
