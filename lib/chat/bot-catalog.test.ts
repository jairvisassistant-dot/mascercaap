import { describe, expect, it } from "vitest";

import {
  CHAT_BOT_APPROVED_AUTONOMOUS_INTENTS,
  CHAT_BOT_CATALOG,
  CHAT_BOT_CATALOG_VERSION,
  CHAT_BOT_INTENTS,
  CHAT_BOT_SENDER_NAME,
  getChatBotCatalogEntry,
} from "./bot-catalog";
import {
  CHAT_MESSAGE_BODY_MAX_LENGTH,
  CHAT_MESSAGE_BODY_MIN_LENGTH,
  CHAT_SENDER_TYPES,
} from "./types";

/**
 * Catalog contract tests (Criterios-Chat.md section 7, Plan Phase 7).
 *
 * The catalog is reviewed content DATA: the approved intent structure, the
 * working provisional texts and the matching rules live here — never
 * hardcoded in classifier or UI logic. These tests pin that separation.
 */

/** Test-local normalizer mirroring the documented matching normalization. */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("chat bot catalog", () => {
  it("exposes a positive version field", () => {
    expect(typeof CHAT_BOT_CATALOG_VERSION).toBe("number");
    expect(CHAT_BOT_CATALOG_VERSION).toBeGreaterThan(0);
  });

  it("defines exactly the 12 product-approved intents, once each", () => {
    expect([...CHAT_BOT_INTENTS]).toEqual([
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
    ]);
    const intents = CHAT_BOT_CATALOG.map((entry) => entry.intent);
    expect(new Set(intents).size).toBe(CHAT_BOT_INTENTS.length);
    expect([...intents].sort()).toEqual([...CHAT_BOT_INTENTS].sort());
  });

  it("holds only provisional approved texts for precios, despachos and horario", () => {
    const withAnswer = CHAT_BOT_CATALOG.filter((entry) => entry.answer !== null);
    expect(withAnswer.map((entry) => entry.intent).sort()).toEqual([
      "despachos",
      "horario",
      "precios",
    ]);
    for (const entry of withAnswer) {
      // Work placeholders until D6 closes; they must be clearly marked.
      expect(entry.answerStatus).toBe("provisional");
      expect(entry.provisional).toBe(true);
    }
  });

  it("keeps every answer inside the enforced 1–1000 plain-text bounds", () => {
    for (const entry of CHAT_BOT_CATALOG) {
      if (entry.answer === null) continue;
      expect(entry.answer.length).toBeGreaterThanOrEqual(CHAT_MESSAGE_BODY_MIN_LENGTH);
      expect(entry.answer.length).toBeLessThanOrEqual(CHAT_MESSAGE_BODY_MAX_LENGTH);
    }
  });

  it("allows autonomous answers only for product-approved intents with an approved text", () => {
    for (const entry of CHAT_BOT_CATALOG) {
      if (entry.autonomous) {
        expect(CHAT_BOT_APPROVED_AUTONOMOUS_INTENTS).toContain(entry.intent);
        expect(entry.answer).not.toBeNull();
      } else if (entry.answer !== null) {
        // A stored text alone must never enable autonomous answering.
        expect(entry.autonomous).toBe(false);
      }
    }
    // productos is product-approved in structure but has no approved text yet
    // (D6), so it must stay non-autonomous.
    expect(getChatBotCatalogEntry("productos")?.autonomous).toBe(false);
    expect(getChatBotCatalogEntry("productos")?.answer).toBeNull();
  });

  it("never marks a handoff-only intent as autonomous", () => {
    for (const intent of [
      "saludo",
      "como_pedir",
      "estado_pedido",
      "mayoreo",
      "facturacion",
      "postventa",
      "humano",
      "fuera_de_alcance",
    ] as const) {
      expect(getChatBotCatalogEntry(intent)?.autonomous).toBe(false);
    }
  });

  it("keeps exact-match phrases unique across intents (no ambiguous catalog data)", () => {
    const seen = new Map<string, string>();
    for (const entry of CHAT_BOT_CATALOG) {
      for (const phrase of entry.exactMatches) {
        const key = normalizeForComparison(phrase);
        expect(key.length).toBeGreaterThan(0);
        const owner = seen.get(key);
        expect(owner === undefined || owner === entry.intent).toBe(true);
        seen.set(key, entry.intent);
      }
    }
  });

  it("keeps the provisional texts verbatim from Criterios-Chat.md section 7", () => {
    expect(getChatBotCatalogEntry("precios")?.answer).toBe(
      "Nuestros precios varían según la presentación (120 g, 300 g y 1000 g) y el sabor. " +
        "¿Te comparto el catálogo con valores actualizados o prefieres que te cotice la coordinadora?"
    );
    expect(getChatBotCatalogEntry("despachos")?.answer).toBe(
      "Entregamos en Bogotá y coordinamos cada pedido según zona y disponibilidad. " +
        "Déjanos tu zona y te confirmamos el despacho."
    );
    expect(getChatBotCatalogEntry("horario")?.answer).toBe(
      "Atendemos de lunes a viernes de 8:00 a.m. a 5:00 p.m.; los sábados de 8:00 a.m. a 12:00 m."
    );
  });

  it("uses a server-derived bot sender name valid for the schema column", () => {
    expect(CHAT_BOT_SENDER_NAME).toBe("Asistente");
    expect(CHAT_SENDER_TYPES).toContain("bot");
    expect(CHAT_BOT_SENDER_NAME.trim().length).toBeGreaterThanOrEqual(2);
    expect(CHAT_BOT_SENDER_NAME.length).toBeLessThanOrEqual(191);
  });

  it("returns null for an unknown intent and freezes the catalog data", () => {
    expect(getChatBotCatalogEntry("inventada" as never)).toBeNull();
    expect(Object.isFrozen(CHAT_BOT_CATALOG)).toBe(true);
    for (const entry of CHAT_BOT_CATALOG) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});
