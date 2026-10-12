/**
 * Deterministic first-line bot intent catalog — reviewed content DATA
 * (Criterios-Chat.md section 7, Plan Phase 7 / LC-WU-10).
 *
 * This module is the single home of the bot's approved structure and texts:
 * the 12 product-approved intent codes, the matching rules (exact phrases and
 * weighted keywords, ES/EN) and the answer texts. Classifier and route logic
 * read this data; they never hardcode business facts.
 *
 * D6 blocker: the answer texts for `precios`, `despachos` and `horario` are
 * the **provisional work placeholders** from `Criterios-Chat.md` section 7,
 * kept verbatim and clearly marked `provisional`. They are replaced by the
 * client's official texts without touching any logic. `productos` is approved
 * in structure but has no approved text yet, so it never answers
 * autonomously. The whole bot stays behind `CHAT_BOT_ENABLED` until D6 closes.
 *
 * Pure data module: no `server-only`, no environment access, no I/O and no
 * import side effects — importing it performs zero behavior in the route.
 */

/** All product-approved intent codes (Criterios-Chat.md section 7). */
export const CHAT_BOT_INTENTS = [
  "saludo",
  "precios",
  "como_pedir",
  "despachos",
  "productos",
  "estado_pedido",
  "mayoreo",
  "facturacion",
  "postventa",
  "horario",
  "humano",
  "fuera_de_alcance",
] as const;

export type ChatBotIntent = (typeof CHAT_BOT_INTENTS)[number];

/**
 * Intents the client approved for autonomous answers (Criterios-Chat.md
 * section 7). An intent answers by itself only when it is in this set AND
 * carries a stored approved text — both conditions are enforced by tests.
 */
export const CHAT_BOT_APPROVED_AUTONOMOUS_INTENTS = [
  "precios",
  "despachos",
  "productos",
  "horario",
] as const;

/** Answer status of a catalog entry. */
export type ChatBotAnswerStatus =
  /** Official client-approved text (none yet — blocked by D6). */
  | "approved"
  /** Provisional work placeholder from Criterios-Chat.md section 7. */
  | "provisional"
  /** No approved text: this intent never answers autonomously. */
  | "pending";

/** One weighted matching keyword. Phrases may contain several words. */
export type ChatBotKeyword = {
  readonly phrase: string;
  /** Strong (2): intent-defining signal. Weak (1): supporting context only. */
  readonly weight: 1 | 2;
};

/** One catalog entry: matching rules plus the reviewed answer data. */
export type ChatBotCatalogEntry = {
  readonly intent: ChatBotIntent;
  /** Approved text shown verbatim when the bot answers; `null` = handoff. */
  readonly answer: string | null;
  readonly answerStatus: ChatBotAnswerStatus;
  /** True while the stored text is a provisional placeholder (D6 open). */
  readonly provisional: boolean;
  /** True only for product-approved intents that carry an approved text. */
  readonly autonomous: boolean;
  /** Full-message phrases (after normalization) that identify the intent. */
  readonly exactMatches: readonly string[];
  /** Weighted keywords matched against the normalized token window. */
  readonly keywords: readonly ChatBotKeyword[];
};

/** Catalog data version; bump on any reviewed content change. */
export const CHAT_BOT_CATALOG_VERSION = 1;

/** Server-derived display name stamped on every bot message. */
export const CHAT_BOT_SENDER_NAME = "Asistente";

/** Contextually typed + frozen entry so keyword weights stay `1 | 2`. */
function freezeEntry(entry: ChatBotCatalogEntry): ChatBotCatalogEntry {
  return Object.freeze(entry);
}

const PROVISIONAL_PRICES_TEXT =
  "Nuestros precios varían según la presentación (120 g, 300 g y 1000 g) y el sabor. " +
  "¿Te comparto el catálogo con valores actualizados o prefieres que te cotice la coordinadora?";

const PROVISIONAL_DELIVERY_TEXT =
  "Entregamos en Bogotá y coordinamos cada pedido según zona y disponibilidad. " +
  "Déjanos tu zona y te confirmamos el despacho.";

const PROVISIONAL_HOURS_TEXT =
  "Atendemos de lunes a viernes de 8:00 a.m. a 5:00 p.m.; los sábados de 8:00 a.m. a 12:00 m.";

/** The reviewed catalog (frozen; tests pin its structure and content). */
export const CHAT_BOT_CATALOG: readonly ChatBotCatalogEntry[] = Object.freeze([
  freezeEntry({
    intent: "saludo" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "hola",
      "buenos días",
      "buenas tardes",
      "buenas noches",
      "hello",
      "hi",
      "good morning",
      "good afternoon",
      "good evening",
      "hey",
    ]),
    keywords: Object.freeze([
      { phrase: "buenos días", weight: 2 },
      { phrase: "buenas tardes", weight: 2 },
      { phrase: "buenas noches", weight: 2 },
      { phrase: "saludos", weight: 1 },
      { phrase: "hello", weight: 1 },
      { phrase: "greetings", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "precios" as const,
    answer: PROVISIONAL_PRICES_TEXT,
    answerStatus: "provisional" as const,
    provisional: true,
    autonomous: true,
    exactMatches: Object.freeze([
      "precio",
      "precios",
      "cuánto cuesta",
      "cuánto vale",
      "price",
      "prices",
      "pricing",
      "price list",
      "how much",
      "what is the price",
      "what are your prices",
    ]),
    keywords: Object.freeze([
      { phrase: "cuánto cuesta", weight: 2 },
      { phrase: "cuánto vale", weight: 2 },
      { phrase: "how much", weight: 2 },
      { phrase: "precio", weight: 2 },
      { phrase: "precios", weight: 2 },
      { phrase: "cuesta", weight: 2 },
      { phrase: "cuestan", weight: 2 },
      { phrase: "price", weight: 2 },
      { phrase: "prices", weight: 2 },
      { phrase: "pricing", weight: 2 },
      { phrase: "cost", weight: 2 },
      { phrase: "cotizar", weight: 1 },
      { phrase: "cotice", weight: 1 },
      { phrase: "tarifa", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "como_pedir" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "cómo pedir",
      "cómo hago un pedido",
      "cómo comprar",
      "hacer un pedido",
      "how to order",
      "how do i order",
      "how can i order",
    ]),
    keywords: Object.freeze([
      { phrase: "cómo pedir", weight: 2 },
      { phrase: "hacer un pedido", weight: 2 },
      { phrase: "how to order", weight: 2 },
      { phrase: "make an order", weight: 2 },
      { phrase: "pedir", weight: 1 },
      { phrase: "comprar", weight: 1 },
      { phrase: "checkout", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "despachos" as const,
    answer: PROVISIONAL_DELIVERY_TEXT,
    answerStatus: "provisional" as const,
    provisional: true,
    autonomous: true,
    exactMatches: Object.freeze([
      "despachos",
      "envíos",
      "entregan",
      "delivery",
      "shipping",
      "do you deliver",
      "zonas de despacho",
    ]),
    keywords: Object.freeze([
      { phrase: "do you deliver", weight: 2 },
      { phrase: "despacho", weight: 1 },
      { phrase: "despachos", weight: 1 },
      { phrase: "envío", weight: 1 },
      { phrase: "envíos", weight: 1 },
      { phrase: "entrega", weight: 1 },
      { phrase: "entregan", weight: 1 },
      { phrase: "delivery", weight: 1 },
      { phrase: "shipping", weight: 1 },
      { phrase: "deliver", weight: 1 },
      { phrase: "zona", weight: 1 },
      { phrase: "domicilio", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "productos" as const,
    answer: null,
    // Approved in structure (D6), but no official text exists yet.
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "productos",
      "qué venden",
      "catálogo",
      "sabores",
      "products",
      "flavors",
      "what do you sell",
    ]),
    keywords: Object.freeze([
      { phrase: "qué venden", weight: 2 },
      { phrase: "what do you sell", weight: 2 },
      { phrase: "producto", weight: 1 },
      { phrase: "productos", weight: 1 },
      { phrase: "sabor", weight: 1 },
      { phrase: "sabores", weight: 1 },
      { phrase: "pulpa", weight: 1 },
      { phrase: "pulpas", weight: 1 },
      { phrase: "zumo", weight: 1 },
      { phrase: "catálogo", weight: 1 },
      { phrase: "catalog", weight: 1 },
      { phrase: "flavor", weight: 1 },
      { phrase: "flavors", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "estado_pedido" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "mi pedido",
      "estado de mi pedido",
      "dónde está mi pedido",
      "seguimiento de pedido",
      "order status",
      "where is my order",
    ]),
    keywords: Object.freeze([
      { phrase: "estado de mi pedido", weight: 2 },
      { phrase: "mi pedido", weight: 2 },
      { phrase: "order status", weight: 2 },
      { phrase: "where is my order", weight: 2 },
      { phrase: "seguimiento", weight: 1 },
      { phrase: "tracking", weight: 1 },
      { phrase: "pedido", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "mayoreo" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "mayoreo",
      "precio mayoreo",
      "por mayor",
      "wholesale",
      "bulk pricing",
    ]),
    keywords: Object.freeze([
      { phrase: "mayoreo", weight: 2 },
      { phrase: "mayoreista", weight: 2 },
      { phrase: "por mayor", weight: 2 },
      { phrase: "wholesale", weight: 2 },
      { phrase: "mayorista", weight: 1 },
      { phrase: "bulk", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "facturacion" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "factura",
      "facturación",
      "invoice",
      "billing",
    ]),
    keywords: Object.freeze([
      { phrase: "factura", weight: 2 },
      { phrase: "facturación", weight: 2 },
      { phrase: "invoice", weight: 2 },
      { phrase: "billing", weight: 2 },
      { phrase: "nit", weight: 2 },
      { phrase: "recibo", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "postventa" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "postventa",
      "devolución",
      "reclamo",
      "queja",
      "after sales",
      "refund",
      "complaint",
    ]),
    keywords: Object.freeze([
      { phrase: "devolución", weight: 2 },
      { phrase: "devoluciones", weight: 2 },
      { phrase: "devolver", weight: 2 },
      { phrase: "reclamo", weight: 2 },
      { phrase: "queja", weight: 2 },
      { phrase: "defecto", weight: 2 },
      { phrase: "garantía", weight: 2 },
      { phrase: "postventa", weight: 2 },
      { phrase: "refund", weight: 2 },
      { phrase: "complaint", weight: 2 },
      { phrase: "damaged", weight: 2 },
      { phrase: "producto malo", weight: 2 },
      { phrase: "dañado", weight: 1 },
      { phrase: "dañada", weight: 1 },
      { phrase: "broken", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "horario" as const,
    answer: PROVISIONAL_HOURS_TEXT,
    answerStatus: "provisional" as const,
    provisional: true,
    autonomous: true,
    exactMatches: Object.freeze([
      "horario",
      "horarios",
      "a qué hora abren",
      "qué hora atienden",
      "opening hours",
      "hours",
      "what time do you open",
    ]),
    keywords: Object.freeze([
      { phrase: "a qué hora", weight: 2 },
      { phrase: "horario", weight: 2 },
      { phrase: "horarios", weight: 2 },
      { phrase: "hours", weight: 2 },
      { phrase: "opening hours", weight: 2 },
      { phrase: "schedule", weight: 2 },
      { phrase: "what time", weight: 2 },
      { phrase: "abren", weight: 1 },
      { phrase: "atienden", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "humano" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    exactMatches: Object.freeze([
      "humano",
      "asesor",
      "persona",
      "atención humana",
      "human",
      "agent",
      "real person",
      "speak to a person",
    ]),
    keywords: Object.freeze([
      { phrase: "atención humana", weight: 2 },
      { phrase: "real person", weight: 2 },
      { phrase: "someone else", weight: 2 },
      { phrase: "humano", weight: 2 },
      { phrase: "asesor", weight: 2 },
      { phrase: "asesora", weight: 2 },
      { phrase: "coordinadora", weight: 2 },
      { phrase: "human", weight: 2 },
      { phrase: "agent", weight: 2 },
      { phrase: "representative", weight: 2 },
      { phrase: "persona", weight: 1 },
      { phrase: "hablar con", weight: 1 },
    ]),
  }),
  freezeEntry({
    intent: "fuera_de_alcance" as const,
    answer: null,
    answerStatus: "pending" as const,
    provisional: false,
    autonomous: false,
    // Unknown input classifies here by fallback; it has no matching rules of
    // its own, so an unmatched message can never "match" this intent and be
    // mistaken for a confident classification.
    exactMatches: Object.freeze([]),
    keywords: Object.freeze([]),
  }),
]);

/** Look up one catalog entry by intent code; `null` for unknown codes. */
export function getChatBotCatalogEntry(intent: ChatBotIntent): ChatBotCatalogEntry | null {
  return CHAT_BOT_CATALOG.find((entry) => entry.intent === intent) ?? null;
}
