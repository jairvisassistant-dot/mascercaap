export type Presentation = "120g" | "300g" | "1000g"

export type PrepType = "jugo" | "frappe"

export type FruitKey =
  | "maracuya"
  | "mora"
  | "mango"
  | "lulo"
  | "guanabana"
  | "fresa"
  | "guayaba"
  | "frutos_rojos"
  | "tomate_arbol"

interface FruitData {
  label: string
  freshKgPer1kgPulp: number
  processingMinPer1kg: number
}

export const FRUIT_DATA: Record<FruitKey, FruitData> = {
  // Solo lavar — sin cáscara ni pepas grandes
  mora:         { label: "Mora",            freshKgPer1kgPulp: 2.8, processingMinPer1kg: 12 },
  fresa:        { label: "Fresa",           freshKgPer1kgPulp: 1.3, processingMinPer1kg: 10 },
  frutos_rojos: { label: "Frutos Rojos",    freshKgPer1kgPulp: 2.5, processingMinPer1kg: 12 },
  // Cáscara que pelar, sin pepas grandes
  maracuya:     { label: "Maracuyá",        freshKgPer1kgPulp: 4.0, processingMinPer1kg: 60 },
  lulo:         { label: "Lulo",            freshKgPer1kgPulp: 3.0, processingMinPer1kg: 35 },
  guayaba:      { label: "Guayaba",         freshKgPer1kgPulp: 2.2, processingMinPer1kg: 25 },
  tomate_arbol: { label: "Tomate de árbol", freshKgPer1kgPulp: 2.5, processingMinPer1kg: 28 },
  // Cáscara + pepas/pepa grande — los más laboriosos
  mango:        { label: "Mango",           freshKgPer1kgPulp: 2.0, processingMinPer1kg: 45 },
  guanabana:    { label: "Guanábana",       freshKgPer1kgPulp: 2.5, processingMinPer1kg: 55 },
}

export const PACK_GRAMS: Record<Presentation, number> = {
  "120g":  120,
  "300g":  300,
  "1000g": 1000,
}

// Fuente: productor — 120g pulpa rinde exactamente 1 vaso de 16oz (473ml) de jugo
// Frappe: mezcla con leche/hielo, menos dilución → más pulpa por vaso → 150g/16oz
export const GRAMS_PER_CUP: Record<PrepType, number> = {
  jugo:   120,
  frappe: 150,
}

export const CUP_OPTIONS = [25, 50, 100, 200] as const

// Solo para display: vasos completos que rinde un paquete (mínimo 1 para no mostrar 0)
export function cupsPerPack(presentation: Presentation, prep: PrepType): number {
  return Math.max(1, Math.floor(PACK_GRAMS[presentation] / GRAMS_PER_CUP[prep]))
}

// Cálculo directo desde gramos — sin pasar por cupsPerPack para evitar doble redondeo
export function packsNeeded(targetCups: number, presentation: Presentation, prep: PrepType): number {
  return Math.ceil((targetCups * GRAMS_PER_CUP[prep]) / PACK_GRAMS[presentation])
}

// Vasos reales que se obtienen de una cantidad de paquetes comprados
export function totalCupsFromPacks(packs: number, presentation: Presentation, prep: PrepType): number {
  return Math.floor((packs * PACK_GRAMS[presentation]) / GRAMS_PER_CUP[prep])
}

interface FreshComparison {
  freshKg: number
  minutesSaved: number
}

export function freshComparison(
  packsCount: number,
  presentation: Presentation,
  fruit: FruitKey
): FreshComparison {
  const pulpKg = (packsCount * PACK_GRAMS[presentation]) / 1000
  const rawFreshKg = pulpKg * FRUIT_DATA[fruit].freshKgPer1kgPulp
  const rawMinutes = rawFreshKg * FRUIT_DATA[fruit].processingMinPer1kg
  return {
    freshKg: Math.round(rawFreshKg * 10) / 10,
    minutesSaved: Math.round(rawMinutes),
  }
}

