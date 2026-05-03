export type Presentation = "120g" | "300g" | "1000g"

export type FruitKey =
  | "maracuya"
  | "mora"
  | "mango"
  | "lulo"
  | "guanabana"
  | "fresa"
  | "pina"
  | "tomate_arbol"

export interface FruitData {
  label: string
  freshKgPer1kgPulp: number
  processingMinPer1kg: number
}

export const FRUIT_DATA: Record<FruitKey, FruitData> = {
  maracuya:     { label: "Maracuyá",       freshKgPer1kgPulp: 4.0, processingMinPer1kg: 60 },
  mora:         { label: "Mora",           freshKgPer1kgPulp: 2.8, processingMinPer1kg: 25 },
  mango:        { label: "Mango",          freshKgPer1kgPulp: 2.0, processingMinPer1kg: 20 },
  lulo:         { label: "Lulo",           freshKgPer1kgPulp: 3.0, processingMinPer1kg: 30 },
  guanabana:    { label: "Guanábana",      freshKgPer1kgPulp: 2.5, processingMinPer1kg: 35 },
  fresa:        { label: "Fresa",          freshKgPer1kgPulp: 1.3, processingMinPer1kg: 15 },
  pina:         { label: "Piña",           freshKgPer1kgPulp: 1.8, processingMinPer1kg: 20 },
  tomate_arbol: { label: "Tomate de árbol", freshKgPer1kgPulp: 2.5, processingMinPer1kg: 25 },
}

export const PACK_GRAMS: Record<Presentation, number> = {
  "120g":  120,
  "300g":  300,
  "1000g": 1000,
}

// Gramos de pulpa por vaso de 12oz con intensidad estándar (MVP fijo)
const GRAMS_PER_CUP = 55

export const CUP_OPTIONS = [25, 50, 100, 200] as const

export function cupsPerPack(presentation: Presentation): number {
  return Math.floor(PACK_GRAMS[presentation] / GRAMS_PER_CUP)
}

export function packsNeeded(targetCups: number, presentation: Presentation): number {
  return Math.ceil(targetCups / cupsPerPack(presentation))
}

export interface FreshComparison {
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

export function buildWhatsappMessage(params: {
  fruit: FruitKey
  presentation: Presentation
  targetCups: number
  packsCount: number
  whatsappNumber: string
}): string {
  const fruitLabel = FRUIT_DATA[params.fruit].label
  const message = [
    "Hola, quiero cotizar un pedido de pulpa:",
    "",
    `Fruta: ${fruitLabel}`,
    `Presentación: ${params.presentation}`,
    `Objetivo: ${params.targetCups} vasos de 12oz`,
    `Cantidad estimada: ${params.packsCount} paquete(s)`,
    "",
    "¿Me confirman disponibilidad y precio?",
  ].join("\n")

  return `https://wa.me/${params.whatsappNumber}?text=${encodeURIComponent(message)}`
}
