import {
  CHAT_BOT_CATALOG,
  getChatBotCatalogEntry,
  type ChatBotIntent,
} from "./bot-catalog";

/**
 * Deterministic first-line bot classifier (Criterios-Chat.md section 7,
 * Plan Phase 7 / LC-WU-10).
 *
 * Hard invariants:
 * - **No LLM, no RAG, no vector store, no free-form generation.** Matching is
 *   normalized exact phrases plus weighted keyword windows over the reviewed
 *   catalog in `bot-catalog.ts`.
 * - **Hard fallback to the coordinator.** Below the confidence threshold, on
 *   any tie/ambiguity, or on any intent without an approved text, the bot
 *   hands off instead of guessing. It never invents a price, policy,
 *   schedule or commercial promise.
 * - **Answers are catalog data.** This module never composes or templates an
 *   answer; it only reports which reviewed catalog text applies.
 *
 * Pure module: no `server-only`, no environment access, no I/O and no import
 * side effects — the route pays zero cost while the bot flag is off.
 */

/** Confidence required before the bot may answer autonomously. */
export const CHAT_BOT_CONFIDENCE_THRESHOLD = 0.7;

const CONFIDENCE_EXACT = 1;
const CONFIDENCE_STRONG_WINNER = 0.9;
const CONFIDENCE_KEYWORD_WINNER = 0.75;
const CONFIDENCE_AMBIGUOUS = 0.4;
const CONFIDENCE_WEAK = 0.3;
const CONFIDENCE_UNKNOWN = 0;

/** Minimum weighted keyword score that may reach the threshold. */
const MIN_KEYWORD_SCORE = 2;
/** Weighted score considered a strong single-intent signal. */
const STRONG_KEYWORD_SCORE = 4;

/**
 * Canonical text normalization for matching: lowercase, diacritics stripped,
 * punctuation removed, whitespace collapsed. Deterministic and locale-free.
 */
export function normalizeBotText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type PreparedKeyword = {
  readonly tokens: readonly string[];
  readonly weight: 1 | 2;
};

type PreparedEntry = {
  readonly intent: ChatBotIntent;
  /** Autonomous only when the entry is approved AND carries an answer. */
  readonly autonomous: boolean;
  readonly answer: string | null;
  readonly exact: ReadonlySet<string>;
  readonly keywords: readonly PreparedKeyword[];
};

/**
 * Module-load preparation of the catalog index. Pure computation over frozen
 * data: no I/O, no environment reads, no behavior observable by the route.
 */
const PREPARED_CATALOG: readonly PreparedEntry[] = Object.freeze(
  CHAT_BOT_CATALOG.map((entry) =>
    Object.freeze({
      intent: entry.intent,
      autonomous: entry.autonomous && entry.answer !== null,
      answer: entry.answer,
      exact: new Set(entry.exactMatches.map(normalizeBotText)),
      keywords: Object.freeze(
        entry.keywords
          .map((keyword) => ({
            tokens: Object.freeze(normalizeBotText(keyword.phrase).split(" ").filter(Boolean)),
            weight: keyword.weight,
          }))
          .filter((keyword) => keyword.tokens.length > 0)
      ),
    })
  )
);

/** True when the keyword's token window appears whole in the input tokens. */
function tokenWindowMatches(inputTokens: readonly string[], keyword: PreparedKeyword): boolean {
  const size = keyword.tokens.length;
  if (size === 0 || size > inputTokens.length) return false;
  for (let start = 0; start <= inputTokens.length - size; start += 1) {
    let matches = true;
    for (let offset = 0; offset < size; offset += 1) {
      if (inputTokens[start + offset] !== keyword.tokens[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function scoreEntry(entry: PreparedEntry, inputTokens: readonly string[]): number {
  let score = 0;
  for (const keyword of entry.keywords) {
    if (tokenWindowMatches(inputTokens, keyword)) score += keyword.weight;
  }
  return score;
}

/** Deterministic classifier result. `autonomous` is already final. */
export type BotClassification = {
  readonly intent: ChatBotIntent;
  readonly confidence: number;
  readonly autonomous: boolean;
};

/**
 * Classifies one visitor message. Unknown input resolves to
 * `fuera_de_alcance` with zero confidence; ties between intents resolve to a
 * below-threshold confidence so the caller hands off instead of guessing.
 */
export function classifyBotMessage(input: string): BotClassification {
  const normalized = normalizeBotText(input);
  if (normalized === "") {
    return { intent: "fuera_de_alcance", confidence: CONFIDENCE_UNKNOWN, autonomous: false };
  }

  // 1. Normalized exact match wins outright (catalog phrases are unique per
  //    intent, enforced by the catalog tests).
  const exactOwners = PREPARED_CATALOG.filter((entry) => entry.exact.has(normalized));
  if (exactOwners.length === 1) {
    const owner = exactOwners[0];
    return {
      intent: owner.intent,
      confidence: CONFIDENCE_EXACT,
      autonomous: owner.autonomous,
    };
  }
  if (exactOwners.length > 1) {
    return {
      intent: exactOwners[0].intent,
      confidence: CONFIDENCE_AMBIGUOUS,
      autonomous: false,
    };
  }

  // 2. Weighted keyword windows; sorted by score, then catalog order.
  const inputTokens = normalized.split(" ");
  const scored = PREPARED_CATALOG.map((entry) => ({
    entry,
    score: scoreEntry(entry, inputTokens),
  }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (top === undefined) {
    return { intent: "fuera_de_alcance", confidence: CONFIDENCE_UNKNOWN, autonomous: false };
  }
  if (top.score < MIN_KEYWORD_SCORE) {
    // A lone weak keyword is a hint, not a decision: record the intent code
    // for aggregates but stay far below the answering threshold.
    return { intent: top.entry.intent, confidence: CONFIDENCE_WEAK, autonomous: false };
  }
  const runnerUp = scored[1];
  if (runnerUp !== undefined && runnerUp.score >= top.score) {
    // Multi-intent or ambiguous message: never guess between topics.
    return { intent: top.entry.intent, confidence: CONFIDENCE_AMBIGUOUS, autonomous: false };
  }

  const confidence =
    top.score >= STRONG_KEYWORD_SCORE ? CONFIDENCE_STRONG_WINNER : CONFIDENCE_KEYWORD_WINNER;
  return {
    intent: top.entry.intent,
    confidence,
    autonomous: top.entry.autonomous && confidence >= CHAT_BOT_CONFIDENCE_THRESHOLD,
  };
}

/** Final bot decision for one visitor message. */
export type BotDecision = {
  readonly intent: ChatBotIntent;
  readonly confidence: number;
  /** True → create a visible handoff; no bot message is ever persisted. */
  readonly handoff: boolean;
  /** Approved catalog text to persist; `null` whenever `handoff` is true. */
  readonly answer: string | null;
};

/**
 * Hard-fallback decision helper: classifies the message and resolves whether
 * the bot may answer. Any doubt — low confidence, ambiguity, an unapproved
 * intent or a missing approved text — hands off to the coordinator.
 */
export function decideBotHandoff(input: string): BotDecision {
  const classification = classifyBotMessage(input);
  const entry = getChatBotCatalogEntry(classification.intent);
  const answer =
    classification.autonomous && classification.confidence >= CHAT_BOT_CONFIDENCE_THRESHOLD
      ? entry?.answer ?? null
      : null;
  const handoff = answer === null;
  return {
    intent: classification.intent,
    confidence: classification.confidence,
    handoff,
    answer: handoff ? null : answer,
  };
}
