import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, RowDataPacket } from "mysql2/promise";

import {
  CHAT_CLOSE_RESULTS,
  CHAT_SENDER_TYPES,
  type ChatCloseResult,
  type ChatSenderType,
} from "./types";

/**
 * Privacy-preserving chat metrics (Criterios-Chat.md section 11,
 * PlanImplementacion-Chat.md Phase 9 / LC-WU-12).
 *
 * The module has two independent halves:
 *
 * 1. **Pure event builders** for every value of the `chat_metrics_events.
 *    event_type` ENUM. They normalise `occurred_at` to UTC, keep the intent code
 *    only on bot-authored message classifications, keep `close_result` only on
 *    `outcome_classified`, and never accept a body, name, email, phone, token or
 *    push endpoint. Purge/consent/cleanup markers are deliberately stored with a
 *    `NULL` conversation id so the evidence survives `ON DELETE CASCADE`.
 * 2. **A pure aggregator** (`aggregateChatMetrics`) that turns fixture or
 *    database rows into daily/weekly/monthly aggregate buckets. It returns
 *    counts, approved codes and dates only — no conversation id, message text
 *    or contact data ever reaches a report payload.
 *
 * Metric sources are intentionally split:
 * - `chat_conversations` (+ `chat_messages` for the first operator reply) is the
 *   source of truth for started/closed counts, the close-result distribution,
 *   the success rate, first-response latency and time to close: it reconciles
 *   exactly with the coordinator's manual classification.
 * - `chat_metrics_events` supplies what the tables cannot: purges (the row is
 *   gone), consent grants/withdrawals, cleanup runs, reopens, bot escalations
 *   and the intent distribution.
 *
 * D3 (first-response SLA) is still open: `slaMinutes` is a required parameter
 * with **no default**, and a `null` value reports `slaPending: true` with
 * `slaCompliance: null` instead of a final KPI.
 */

/* ── Errors ─────────────────────────────────────────────────────────────── */

/** Raised for malformed metric input before any report is produced. */
export class ChatMetricsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatMetricsInputError";
  }
}

/* ── Event builders ─────────────────────────────────────────────────────── */

/** Every value of the `chat_metrics_events.event_type` ENUM (migration 001). */
export const CHAT_METRICS_EVENT_TYPES = [
  "conversation_created",
  "message_persisted",
  "first_operator_response",
  "presence_expired",
  "conversation_closed",
  "conversation_purged",
  "outcome_classified",
  "consent_granted",
  "consent_revoked",
  "cleanup_completed",
] as const;

export type ChatMetricsEventType = (typeof CHAT_METRICS_EVENT_TYPES)[number];

/**
 * Event types whose evidence must outlive the conversation: they are written
 * with a `NULL` conversation id because every conversation-scoped metric row is
 * removed by `ON DELETE CASCADE` when the thread is purged.
 */
const CONVERSATION_INDEPENDENT_EVENT_TYPES: readonly ChatMetricsEventType[] = [
  "conversation_purged",
  "consent_granted",
  "consent_revoked",
  "cleanup_completed",
];

/** Column width of `chat_metrics_events.intent` (VARCHAR(64)). */
export const CHAT_METRIC_INTENT_MAX_LENGTH = 64;

/** Width of `chat_conversations.id` / `chat_metrics_events.conversation_id`. */
export const CHAT_METRIC_CONVERSATION_ID_MAX_LENGTH = 191;

/** Intent code shape: lowercase token, never free text or contact data. */
const INTENT_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/** A fully normalised metric event, ready for `chat_metrics_events`. */
export type ChatMetricsEvent = {
  readonly id: string;
  readonly conversationId: string | null;
  readonly eventType: ChatMetricsEventType;
  readonly senderType: ChatSenderType | null;
  readonly intent: string | null;
  readonly closeResult: ChatCloseResult | null;
  readonly occurredAt: Date;
};

/** Input accepted by every builder; unknown fields are never carried through. */
export type ChatMetricsEventBuilderInput = {
  readonly id?: string;
  readonly conversationId?: string | null;
  readonly occurredAt: Date | string;
  readonly senderType?: ChatSenderType | null;
  readonly intent?: string | null;
  readonly closeResult?: string | null;
};

/**
 * Converts an event instant to its UTC representation. `Date` is already an
 * UTC epoch internally; a string must be an unambiguous ISO instant (offset or
 * `Z`), never a timezone-less local value.
 */
function toUtcDate(value: Date | string, field: string): Date {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "string"
        ? new Date(value)
        : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) {
    throw new ChatMetricsInputError(`${field} must be a valid date.`);
  }
  return date;
}

function assertConversationId(value: string | null): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0) {
    throw new ChatMetricsInputError("Conversation id must be a non-empty string.");
  }
  if (value !== value.trim()) {
    throw new ChatMetricsInputError("Conversation id must not contain surrounding whitespace.");
  }
  if (value.includes("\u0000")) {
    throw new ChatMetricsInputError("Conversation id must not contain a null byte.");
  }
  if (value.length > CHAT_METRIC_CONVERSATION_ID_MAX_LENGTH) {
    throw new ChatMetricsInputError("Conversation id is too long.");
  }
  return value;
}

function assertCloseResult(value: string | null | undefined): ChatCloseResult {
  if (typeof value !== "string" || !(CHAT_CLOSE_RESULTS as readonly string[]).includes(value)) {
    throw new ChatMetricsInputError("close_result must be an approved classification.");
  }
  return value as ChatCloseResult;
}

function resolveSenderType(
  eventType: ChatMetricsEventType,
  value: ChatSenderType | null | undefined
): ChatSenderType | null {
  if (eventType === "first_operator_response") {
    if (value === undefined || value === null) return "operator";
    if (value !== "operator") {
      throw new ChatMetricsInputError("first_operator_response is always operator-authored.");
    }
    return "operator";
  }
  if (eventType !== "message_persisted") return null;
  if (value === undefined || value === null) return null;
  if (!(CHAT_SENDER_TYPES as readonly string[]).includes(value)) {
    throw new ChatMetricsInputError("sender_type is not supported.");
  }
  return value;
}

function resolveIntent(
  eventType: ChatMetricsEventType,
  senderType: ChatSenderType | null,
  value: string | null | undefined
): string | null {
  // Intent is carried only by bot-authored message classifications; every other
  // event type and every non-bot sender stores NULL (no free text, no code).
  if (eventType !== "message_persisted" || senderType !== "bot") return null;
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > CHAT_METRIC_INTENT_MAX_LENGTH) {
    throw new ChatMetricsInputError("intent code is too long.");
  }
  if (value.includes("\u0000")) {
    throw new ChatMetricsInputError("intent code must not contain a null byte.");
  }
  return value;
}

function buildChatMetricEvent(
  eventType: ChatMetricsEventType,
  input: ChatMetricsEventBuilderInput
): ChatMetricsEvent {
  const occurredAt = toUtcDate(input.occurredAt, "occurred_at");
  const conversationId = CONVERSATION_INDEPENDENT_EVENT_TYPES.includes(eventType)
    ? null
    : assertConversationId(input.conversationId ?? null);
  const senderType = resolveSenderType(eventType, input.senderType);
  const intent = resolveIntent(eventType, senderType, input.intent);
  const closeResult =
    eventType === "outcome_classified" ? assertCloseResult(input.closeResult) : null;

  return Object.freeze({
    id: input.id ?? randomUUID(),
    conversationId,
    eventType,
    senderType,
    intent,
    closeResult,
    occurredAt,
  });
}

/** `conversation_created` — one chat opened (or reopened). */
export function buildConversationCreatedEvent(
  input: ChatMetricsEventBuilderInput
): ChatMetricsEvent {
  return buildChatMetricEvent("conversation_created", input);
}

/**
 * `message_persisted` — one classified visitor message. `intent` survives only
 * when `senderType` is `bot`; handoff rows store NULL (see module contract).
 */
export function buildMessagePersistedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("message_persisted", input);
}

/** `first_operator_response` — the first coordinator reply of a conversation. */
export function buildFirstOperatorResponseEvent(
  input: ChatMetricsEventBuilderInput
): ChatMetricsEvent {
  return buildChatMetricEvent("first_operator_response", input);
}

/** `presence_expired` — the visitor left without an operator turn. */
export function buildPresenceExpiredEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("presence_expired", input);
}

/** `conversation_closed` — thread closed; classification lives in its own event. */
export function buildConversationClosedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("conversation_closed", input);
}

/** `conversation_purged` — physical deletion marker (conversation id is NULL). */
export function buildConversationPurgedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("conversation_purged", input);
}

/** `outcome_classified` — mandatory close classification; `closeResult` required. */
export function buildOutcomeClassifiedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("outcome_classified", input);
}

/** `consent_granted` — commercial opt-in evidence (conversation-independent). */
export function buildConsentGrantedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("consent_granted", input);
}

/** `consent_revoked` — commercial opt-out evidence (conversation-independent). */
export function buildConsentRevokedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("consent_revoked", input);
}

/** `cleanup_completed` — one finished retention batch (conversation-independent). */
export function buildCleanupCompletedEvent(input: ChatMetricsEventBuilderInput): ChatMetricsEvent {
  return buildChatMetricEvent("cleanup_completed", input);
}

/* ── Best-effort emission ───────────────────────────────────────────────── */

/** Sink for metric events; implemented over mysql2 or a test spy. */
export interface ChatMetricsEventWriter {
  insertEvent(event: ChatMetricsEvent): Promise<void>;
}

/** mysql2 adapter for {@link ChatMetricsEventWriter} (bound parameters only). */
export function createChatMetricsEventWriter(pool: Pool): ChatMetricsEventWriter {
  return {
    async insertEvent(event) {
      await pool.execute(INSERT_CHAT_METRIC_EVENT_SQL, [
        ...chatMetricEventInsertParams(event),
      ]);
    },
  };
}

/**
 * Writes one metric event and **never throws**: metric emission is a side
 * observation of a primary operation (cleanup, consent capture) and must not be
 * able to fail it. Resolves `false` when the write was dropped.
 */
export async function writeChatMetricEventBestEffort(
  writer: ChatMetricsEventWriter,
  event: ChatMetricsEvent
): Promise<boolean> {
  try {
    await writer.insertEvent(event);
    return true;
  } catch {
    return false;
  }
}

const INSERT_CHAT_METRIC_EVENT_SQL =
  "INSERT INTO chat_metrics_events " +
  "(id, conversation_id, event_type, sender_type, intent, close_result, occurred_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?)";

/** Statement for one metric event; values always travel as bound parameters. */
export const CHAT_METRIC_EVENT_INSERT_SQL = INSERT_CHAT_METRIC_EVENT_SQL;

/** Bound values accepted by the metric-event INSERT. */
export type ChatMetricEventSqlParam =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | Buffer
  | Uint8Array;

/** Bound parameter list for {@link CHAT_METRIC_EVENT_INSERT_SQL}. */
export function chatMetricEventInsertParams(
  event: ChatMetricsEvent
): readonly ChatMetricEventSqlParam[] {
  return [
    event.id,
    event.conversationId,
    event.eventType,
    event.senderType,
    event.intent,
    event.closeResult,
    event.occurredAt,
  ];
}

/* ── Range, granularity and parameter parsing ───────────────────────────── */

/** Inclusive report windows are bounded: 366 days is one full year plus a day. */
export const CHAT_METRICS_MAX_RANGE_DAYS = 366;

export const CHAT_METRICS_GRANULARITIES = ["day", "week", "month"] as const;
export type MetricsGranularity = (typeof CHAT_METRICS_GRANULARITIES)[number];

export const CHAT_METRICS_DEFAULT_GRANULARITY: MetricsGranularity = "day";

/** Upper bound for the SLA parameter (one week in minutes). */
export const CHAT_METRICS_MAX_SLA_MINUTES = 10_080;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function utcDayMs(dateString: string): number {
  const match = DATE_PATTERN.exec(dateString);
  if (match === null) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Parses a strict `YYYY-MM-DD` UTC date; rejects impossible calendar dates. */
export function parseMetricsDate(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const match = DATE_PATTERN.exec(raw);
  if (match === null) return null;
  const ms = utcDayMs(raw);
  if (Number.isNaN(ms)) return null;
  const date = new Date(ms);
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }
  return raw;
}

/** Inclusive day count of `[from, to]`. */
export function metricsRangeDayCount(from: string, to: string): number {
  const diff = utcDayMs(to) - utcDayMs(from);
  if (Number.isNaN(diff)) return Number.NaN;
  return Math.round(diff / MS_PER_DAY) + 1;
}

/**
 * Validates the full report window: two strict UTC dates, ordered, at most
 * {@link CHAT_METRICS_MAX_RANGE_DAYS} days inclusive. No default window exists.
 */
export function parseMetricsRange(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined
): { readonly from: string; readonly to: string } | null {
  const from = parseMetricsDate(fromRaw);
  const to = parseMetricsDate(toRaw);
  if (from === null || to === null) return null;
  if (utcDayMs(from) > utcDayMs(to)) return null;
  const days = metricsRangeDayCount(from, to);
  if (!Number.isFinite(days) || days > CHAT_METRICS_MAX_RANGE_DAYS) return null;
  return { from, to };
}

/** Absent → default `day`; any other unknown value → `{ ok: false }`. */
export function parseMetricsGranularity(
  raw: string | null | undefined
): { readonly ok: true; readonly value: MetricsGranularity } | { readonly ok: false } {
  if (raw === null || raw === undefined) return { ok: true, value: CHAT_METRICS_DEFAULT_GRANULARITY };
  if ((CHAT_METRICS_GRANULARITIES as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as MetricsGranularity };
  }
  return { ok: false };
}

/**
 * Parses the optional SLA parameter. Absent → `{ ok: true, value: null }`
 * (D3 pending); a malformed value is rejected instead of being defaulted.
 */
export function parseSlaMinutes(
  raw: string | null | undefined
): { readonly ok: true; readonly value: number | null } | { readonly ok: false } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (raw.trim() === "") return { ok: false };
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > CHAT_METRICS_MAX_SLA_MINUTES) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** UTC calendar day of an instant (`YYYY-MM-DD`). */
export function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Bucket key of an instant: `YYYY-MM-DD`, ISO week start (Monday) or `YYYY-MM`. */
export function bucketStartKey(date: Date, granularity: MetricsGranularity): string {
  if (granularity === "day") return utcDateKey(date);
  if (granularity === "month") return utcDateKey(date).slice(0, 7);
  const dayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const weekdayOffset = (new Date(dayMs).getUTCDay() + 6) % 7; // Monday = 0
  return utcDateKey(new Date(dayMs - weekdayOffset * MS_PER_DAY));
}

/**
 * Every bucket start covering `[from, to]` in ascending order (empty buckets
 * included). The first bucket may start before `from`: it is the bucket that
 * contains the first day of the window.
 */
export function listBucketStarts(
  from: string,
  to: string,
  granularity: MetricsGranularity
): string[] {
  const fromMs = utcDayMs(from);
  const toMs = utcDayMs(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) return [];
  const keys = new Set<string>();
  for (let cursor = fromMs; cursor <= toMs; cursor += MS_PER_DAY) {
    keys.add(bucketStartKey(new Date(cursor), granularity));
  }
  return [...keys];
}

/** UTC-midnight lower bound (inclusive) of a `YYYY-MM-DD` date. */
export function utcStartOfDay(dateString: string): Date {
  return new Date(utcDayMs(dateString));
}

/** UTC-midnight bound one day after `date` (exclusive upper bound). */
export function utcStartOfNextDay(dateString: string): Date {
  return new Date(utcDayMs(dateString) + MS_PER_DAY);
}

/* ── Aggregation ────────────────────────────────────────────────────────── */

/** One conversation as the aggregator needs it (no contact data). */
export type MetricsConversationInput = {
  readonly id: string;
  readonly createdAt: Date | string;
  readonly closedAt?: Date | string | null;
  readonly closeResult?: string | null;
  readonly firstOperatorResponseAt?: Date | string | null;
};

/** One metric event row as the aggregator needs it. */
export type MetricsEventInput = {
  readonly conversationId?: string | null;
  readonly eventType: string;
  readonly senderType?: string | null;
  readonly intent?: string | null;
  readonly closeResult?: string | null;
  readonly occurredAt: Date | string;
};

/** Nearest-rank percentile statistics, in seconds. `count` disambiguates zeros. */
export type ChatMetricsLatency = {
  readonly count: number;
  readonly medianSeconds: number;
  readonly p90Seconds: number;
};

/** Aggregate counters for one bucket (or, with `bucketStart`, the summary). */
export type ChatMetricsTotals = {
  readonly started: number;
  readonly closed: number;
  readonly purged: number;
  readonly reopened: number;
  readonly presenceExpired: number;
  readonly coordinatorUnanswered: number;
  readonly visitorAbandoned: number;
  readonly botEscalations: number;
  readonly classifiedClosed: number;
  readonly successCount: number;
  readonly successRate: number | null;
  readonly closeResults: Readonly<Record<string, number>>;
  readonly intents: Readonly<Record<string, number>>;
  readonly firstResponse: ChatMetricsLatency;
  readonly timeToClose: ChatMetricsLatency;
  readonly consentGranted: number;
  readonly consentRevoked: number;
  readonly cleanupRuns: number;
  readonly unclassifiedClosed: number;
  readonly missingFirstResponse: number;
};

export type ChatMetricsBucket = ChatMetricsTotals & {
  readonly bucketStart: string;
};

export type ChatMetricsSummary = ChatMetricsTotals & {
  /** Snapshot of granted and never-revoked contacts (not a daily count). */
  readonly activeEligibleContacts: number;
  /** Snapshot of outbox rows in `failed` state. */
  readonly failedOutboxJobs: number;
  /** Range-level cleanup health signal (see {@link detectDataQualityAlerts}). */
  readonly cleanupRunsFailed: number;
};

export type ChatMetricsSlaCompliance = {
  readonly slaMinutes: number;
  readonly measured: number;
  readonly withinSla: number;
  readonly rate: number | null;
};

export type ChatMetricsReport = {
  readonly range: {
    readonly from: string;
    readonly to: string;
    readonly granularity: MetricsGranularity;
  };
  readonly buckets: readonly ChatMetricsBucket[];
  readonly summary: ChatMetricsSummary;
  /** `null` while D3 (first-response SLA) is open. */
  readonly slaCompliance: ChatMetricsSlaCompliance | null;
  readonly slaPending: boolean;
  readonly alerts: readonly ChatMetricsAlert[];
};

export type ChatMetricsAggregateInput = {
  readonly conversations: readonly MetricsConversationInput[];
  readonly events: readonly MetricsEventInput[];
  readonly from: string;
  readonly to: string;
  readonly granularity: MetricsGranularity;
  /** Required, no default: `null` reports `slaPending` instead of a KPI. */
  readonly slaMinutes: number | null;
  readonly activeEligibleContacts: number;
  readonly failedOutboxJobs: number;
};

/** Success numerator: resolved chats plus sales/orders (Criterios §11). */
const SUCCESS_CLOSE_RESULTS: readonly ChatCloseResult[] = ["resuelto", "venta_o_pedido"];

/** Close result that documents a coordinator who never answered. */
const COORDINATOR_UNANSWERED_RESULT: ChatCloseResult = "sin_respuesta_de_la_coordinadora";

/** Close result that documents a visitor who never answered. */
const VISITOR_ABANDONED_RESULT: ChatCloseResult = "sin_respuesta_del_cliente";

type MutableTotals = {
  started: number;
  closed: number;
  purged: number;
  reopened: number;
  presenceExpired: number;
  coordinatorUnanswered: number;
  visitorAbandoned: number;
  botEscalations: number;
  classifiedClosed: number;
  successCount: number;
  closeResults: Record<string, number>;
  intents: Record<string, number>;
  firstResponseSeconds: number[];
  timeToCloseSeconds: number[];
  consentGranted: number;
  consentRevoked: number;
  cleanupRuns: number;
  unclassifiedClosed: number;
  missingFirstResponse: number;
};

function newTotals(): MutableTotals {
  return {
    started: 0,
    closed: 0,
    purged: 0,
    reopened: 0,
    presenceExpired: 0,
    coordinatorUnanswered: 0,
    visitorAbandoned: 0,
    botEscalations: 0,
    classifiedClosed: 0,
    successCount: 0,
    closeResults: {},
    intents: {},
    firstResponseSeconds: [],
    timeToCloseSeconds: [],
    consentGranted: 0,
    consentRevoked: 0,
    cleanupRuns: 0,
    unclassifiedClosed: 0,
    missingFirstResponse: 0,
  };
}

/** Nearest-rank p90 + interpolated median, in seconds. */
function latencyStats(values: readonly number[]): ChatMetricsLatency {
  if (values.length === 0) return { count: 0, medianSeconds: 0, p90Seconds: 0 };
  const sorted = [...values].sort((left, right) => left - right);
  const count = sorted.length;
  const median =
    count % 2 === 1
      ? sorted[(count - 1) / 2]
      : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
  const p90 = sorted[Math.max(0, Math.ceil(0.9 * count) - 1)];
  return { count, medianSeconds: median, p90Seconds: p90 };
}

function successRateOf(successCount: number, classifiedClosed: number): number | null {
  return classifiedClosed > 0 ? successCount / classifiedClosed : null;
}

function freezeTotals(totals: MutableTotals): ChatMetricsTotals {
  return Object.freeze({
    started: totals.started,
    closed: totals.closed,
    purged: totals.purged,
    reopened: totals.reopened,
    presenceExpired: totals.presenceExpired,
    coordinatorUnanswered: totals.coordinatorUnanswered,
    visitorAbandoned: totals.visitorAbandoned,
    botEscalations: totals.botEscalations,
    classifiedClosed: totals.classifiedClosed,
    successCount: totals.successCount,
    successRate: successRateOf(totals.successCount, totals.classifiedClosed),
    closeResults: Object.freeze({ ...totals.closeResults }),
    intents: Object.freeze({ ...totals.intents }),
    firstResponse: latencyStats(totals.firstResponseSeconds),
    timeToClose: latencyStats(totals.timeToCloseSeconds),
    consentGranted: totals.consentGranted,
    consentRevoked: totals.consentRevoked,
    cleanupRuns: totals.cleanupRuns,
    unclassifiedClosed: totals.unclassifiedClosed,
    missingFirstResponse: totals.missingFirstResponse,
  });
}

function normalizeCloseResult(value: string | null | undefined): ChatCloseResult | null {
  if (typeof value !== "string") return null;
  return (CHAT_CLOSE_RESULTS as readonly string[]).includes(value)
    ? (value as ChatCloseResult)
    : null;
}

/**
 * Accepts only a code-shaped intent; free text (an address, a name, a phrase)
 * is dropped so a careless row can never leak into a report.
 */
export function normalizeIntentCode(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return INTENT_CODE_PATTERN.test(value) ? value : null;
}

function conversationIdOf(row: MetricsEventInput): string | null {
  const value = row.conversationId;
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

/**
 * Builds a daily/weekly/monthly report from fixture or database rows.
 *
 * Every parameter is required — including `slaMinutes`, which has no default
 * because D3 is still open.
 */
export function aggregateChatMetrics(input: ChatMetricsAggregateInput): ChatMetricsReport {
  if (!("slaMinutes" in input)) {
    throw new ChatMetricsInputError("slaMinutes is a required parameter and has no default.");
  }
  const slaMinutes = input.slaMinutes;
  if (slaMinutes !== null) {
    if (
      typeof slaMinutes !== "number" ||
      !Number.isInteger(slaMinutes) ||
      slaMinutes < 1 ||
      slaMinutes > CHAT_METRICS_MAX_SLA_MINUTES
    ) {
      throw new ChatMetricsInputError("slaMinutes must be a positive integer when provided.");
    }
  }

  const range = parseMetricsRange(input.from, input.to);
  if (range === null || range.from !== input.from || range.to !== input.to) {
    throw new ChatMetricsInputError("Invalid metrics range.");
  }
  if (!(CHAT_METRICS_GRANULARITIES as readonly string[]).includes(input.granularity)) {
    throw new ChatMetricsInputError("Unsupported granularity.");
  }
  for (const value of [input.activeEligibleContacts, input.failedOutboxJobs]) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new ChatMetricsInputError("Snapshot counters must be non-negative integers.");
    }
  }

  const windowStartMs = utcDayMs(range.from);
  const windowEndMs = utcDayMs(range.to) + MS_PER_DAY; // exclusive
  const inWindow = (date: Date): boolean => {
    const ms = date.getTime();
    return ms >= windowStartMs && ms < windowEndMs;
  };

  const bucketKeys = listBucketStarts(range.from, range.to, input.granularity);
  const buckets = new Map<string, MutableTotals>();
  for (const key of bucketKeys) buckets.set(key, newTotals());
  const summary = newTotals();

  const feed = (date: Date, apply: (totals: MutableTotals) => void): void => {
    if (!inWindow(date)) return;
    apply(summary);
    const key = bucketStartKey(date, input.granularity);
    let target = buckets.get(key);
    if (target === undefined) {
      target = newTotals();
      buckets.set(key, target);
    }
    apply(target);
  };

  /* Conversations: started/closed/classification/latency (table source). */
  const firstCloseByConversation = new Map<string, number>();
  const rememberClose = (conversationId: string, at: Date): void => {
    const known = firstCloseByConversation.get(conversationId);
    if (known === undefined || at.getTime() < known) {
      firstCloseByConversation.set(conversationId, at.getTime());
    }
  };

  for (const conversation of input.conversations) {
    const createdAt = toUtcDate(conversation.createdAt, "createdAt");
    const closedAt =
      conversation.closedAt === undefined || conversation.closedAt === null
        ? null
        : toUtcDate(conversation.closedAt, "closedAt");
    const firstResponseAt =
      conversation.firstOperatorResponseAt === undefined ||
      conversation.firstOperatorResponseAt === null
        ? null
        : toUtcDate(conversation.firstOperatorResponseAt, "firstOperatorResponseAt");

    feed(createdAt, (totals) => {
      totals.started += 1;
    });

    const closeResult = normalizeCloseResult(conversation.closeResult);

    if (closedAt !== null) {
      rememberClose(conversation.id, closedAt);
      const seconds = (closedAt.getTime() - createdAt.getTime()) / 1000;
      feed(closedAt, (totals) => {
        totals.closed += 1;
        if (seconds >= 0) totals.timeToCloseSeconds.push(seconds);
        if (closeResult === null) {
          totals.unclassifiedClosed += 1;
          return;
        }
        totals.classifiedClosed += 1;
        totals.closeResults[closeResult] = (totals.closeResults[closeResult] ?? 0) + 1;
        if (SUCCESS_CLOSE_RESULTS.includes(closeResult)) totals.successCount += 1;
        if (closeResult === COORDINATOR_UNANSWERED_RESULT) totals.coordinatorUnanswered += 1;
        if (closeResult === VISITOR_ABANDONED_RESULT) totals.visitorAbandoned += 1;
        if (
          firstResponseAt === null &&
          closeResult !== COORDINATOR_UNANSWERED_RESULT
        ) {
          totals.missingFirstResponse += 1;
        }
      });
    }

    if (firstResponseAt !== null) {
      const seconds = (firstResponseAt.getTime() - createdAt.getTime()) / 1000;
      if (seconds >= 0) {
        feed(firstResponseAt, (totals) => {
          totals.firstResponseSeconds.push(seconds);
        });
      }
    }
  }

  /* Events: purges, consent, cleanup, presence, escalations, intents. */
  const escalationsByConversation = new Map<string, Date>();
  const createdEvents: Array<{ conversationId: string; at: Date }> = [];
  const closedEvents: Array<{ conversationId: string; at: Date }> = [];

  for (const event of input.events) {
    const at = toUtcDate(event.occurredAt, "occurred_at");
    const conversationId = conversationIdOf(event);

    switch (event.eventType) {
      case "conversation_created": {
        if (conversationId !== null) createdEvents.push({ conversationId, at });
        break;
      }
      case "conversation_closed": {
        if (conversationId !== null) closedEvents.push({ conversationId, at });
        break;
      }
      case "conversation_purged": {
        feed(at, (totals) => {
          totals.purged += 1;
        });
        break;
      }
      case "presence_expired": {
        feed(at, (totals) => {
          totals.presenceExpired += 1;
        });
        break;
      }
      case "consent_granted": {
        feed(at, (totals) => {
          totals.consentGranted += 1;
        });
        break;
      }
      case "consent_revoked": {
        feed(at, (totals) => {
          totals.consentRevoked += 1;
        });
        break;
      }
      case "cleanup_completed": {
        feed(at, (totals) => {
          totals.cleanupRuns += 1;
        });
        break;
      }
      case "message_persisted": {
        const intent = normalizeIntentCode(event.intent);
        if (intent !== null) {
          feed(at, (totals) => {
            totals.intents[intent] = (totals.intents[intent] ?? 0) + 1;
          });
        }
        // `senderType === visitor` on a classified message is the LC-WU-10
        // handoff signature: the bot declined and the chat escalated.
        if (event.senderType === "visitor" && conversationId !== null) {
          const known = escalationsByConversation.get(conversationId);
          if (known === undefined || at.getTime() < known.getTime()) {
            escalationsByConversation.set(conversationId, at);
          }
        }
        break;
      }
      default: {
        // Unknown event types are ignored: a report never echoes raw input.
        break;
      }
    }
  }

  for (const at of escalationsByConversation.values()) {
    feed(at, (totals) => {
      totals.botEscalations += 1;
    });
  }

  /* Reopened: a `conversation_created` that happens after that chat was closed. */
  for (const closed of closedEvents) rememberClose(closed.conversationId, closed.at);

  for (const created of createdEvents) {
    const firstClose = firstCloseByConversation.get(created.conversationId);
    if (firstClose === undefined || created.at.getTime() <= firstClose) continue;
    feed(created.at, (totals) => {
      totals.reopened += 1;
    });
  }

  const finalizedBuckets: ChatMetricsBucket[] = [...buckets.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([bucketStart, totals]) => Object.freeze({ bucketStart, ...freezeTotals(totals) }));

  const firstResponseValues = summary.firstResponseSeconds;
  const withinSla =
    slaMinutes === null
      ? 0
      : firstResponseValues.filter((seconds) => seconds <= slaMinutes * 60).length;
  const slaCompliance: ChatMetricsSlaCompliance | null =
    slaMinutes === null
      ? null
      : {
          slaMinutes,
          measured: firstResponseValues.length,
          withinSla,
          rate: firstResponseValues.length > 0 ? withinSla / firstResponseValues.length : null,
        };

  // Range-level cleanup health: purges recorded while no cleanup run completed
  // means at least one run failed before writing its completion marker.
  const cleanupRunsFailed = summary.purged > 0 && summary.cleanupRuns === 0 ? 1 : 0;

  const summaryTotals = freezeTotals(summary);
  const chatMetricsSummary: ChatMetricsSummary = Object.freeze({
    ...summaryTotals,
    activeEligibleContacts: input.activeEligibleContacts,
    failedOutboxJobs: input.failedOutboxJobs,
    cleanupRunsFailed,
  });

  const alerts = detectDataQualityAlerts({
    unclassifiedClosed: summaryTotals.unclassifiedClosed,
    missingFirstResponse: summaryTotals.missingFirstResponse,
    failedOutboxJobs: input.failedOutboxJobs,
    failedCleanupRuns: cleanupRunsFailed,
  });

  return Object.freeze({
    range: { from: range.from, to: range.to, granularity: input.granularity },
    buckets: finalizedBuckets,
    summary: chatMetricsSummary,
    slaCompliance,
    slaPending: slaMinutes === null,
    alerts,
  });
}

/* ── Data-quality alerts ────────────────────────────────────────────────── */

/**
 * Alert thresholds. Every threshold is `0`: any occurrence is reportable.
 * These are placeholders until the coordinator confirms stricter rules
 * (decision record section 17).
 */
export const DATA_QUALITY_THRESHOLDS = Object.freeze({
  unclassified_closed: 0,
  missing_first_response: 0,
  failed_outbox_jobs: 0,
  failed_cleanup_runs: 0,
});

export type ChatMetricsAlertCode = keyof typeof DATA_QUALITY_THRESHOLDS;

export type ChatMetricsAlert = {
  readonly code: ChatMetricsAlertCode;
  readonly count: number;
  readonly threshold: number;
};

export type DataQualityInput = {
  readonly unclassifiedClosed: number;
  readonly missingFirstResponse: number;
  readonly failedOutboxJobs: number;
  readonly failedCleanupRuns: number;
};

/**
 * Pure detector: turns data-quality counters into alerts above threshold.
 * Counters are supplied by the caller (the report aggregator or an operator),
 * so the detector itself performs no I/O.
 */
export function detectDataQualityAlerts(input: DataQualityInput): readonly ChatMetricsAlert[] {
  const candidates: readonly (readonly [ChatMetricsAlertCode, number])[] = [
    ["unclassified_closed", input.unclassifiedClosed],
    ["missing_first_response", input.missingFirstResponse],
    ["failed_outbox_jobs", input.failedOutboxJobs],
    ["failed_cleanup_runs", input.failedCleanupRuns],
  ];
  const alerts: ChatMetricsAlert[] = [];
  for (const [code, count] of candidates) {
    const threshold = DATA_QUALITY_THRESHOLDS[code];
    if (count > threshold) alerts.push(Object.freeze({ code, count, threshold }));
  }
  return alerts;
}

/* ── Report store (mysql2) ──────────────────────────────────────────────── */

/** Upper bound on conversation rows pulled for one report. */
export const CHAT_METRICS_MAX_CONVERSATION_ROWS = 50_000;

/** Upper bound on metric event rows pulled for one report. */
export const CHAT_METRICS_MAX_EVENT_ROWS = 200_000;

export type MetricsConversationRecord = {
  readonly id: string;
  readonly createdAt: string;
  readonly closedAt: string | null;
  readonly closeResult: string | null;
  readonly firstOperatorResponseAt: string | null;
};

export type MetricsEventRecord = {
  readonly conversationId: string | null;
  readonly eventType: string;
  readonly senderType: string | null;
  readonly intent: string | null;
  readonly closeResult: string | null;
  readonly occurredAt: string;
};

/**
 * Conversations touched by the window, with the first coordinator reply
 * resolved in the same statement. Values are bound; nothing is interpolated.
 */
export const SELECT_METRICS_CONVERSATIONS_SQL =
  "SELECT c.id, c.created_at, c.closed_at, c.close_result, " +
  "(SELECT MIN(m.created_at) FROM chat_messages m " +
  "WHERE m.conversation_id = c.id AND m.sender_type = 'operator') AS first_operator_at " +
  "FROM chat_conversations c " +
  "WHERE (c.created_at >= ? AND c.created_at < ?) OR (c.closed_at >= ? AND c.closed_at < ?) " +
  "ORDER BY c.created_at ASC, c.id ASC LIMIT ?";

/** Metric events inside the window. Values are bound; nothing is interpolated. */
export const SELECT_METRICS_EVENTS_SQL =
  "SELECT conversation_id, event_type, sender_type, intent, close_result, occurred_at " +
  "FROM chat_metrics_events WHERE occurred_at >= ? AND occurred_at < ? " +
  "ORDER BY occurred_at ASC LIMIT ?";

/** Contacts that are granted and never revoked (count only, never the value). */
export const SELECT_ACTIVE_ELIGIBLE_CONTACTS_SQL =
  "SELECT COUNT(*) AS total FROM chat_contact_consents " +
  "WHERE consent_state = 'granted' AND revoked_at IS NULL";

/** Outbox rows left in `failed` state (count only, never the recipient). */
export const SELECT_FAILED_OUTBOX_JOBS_SQL =
  "SELECT COUNT(*) AS total FROM chat_email_outbox WHERE status = 'failed'";

export interface MetricsReportStore {
  loadConversations(bounds: {
    readonly from: Date;
    readonly toExclusive: Date;
  }): Promise<readonly MetricsConversationRecord[]>;
  loadEvents(bounds: {
    readonly from: Date;
    readonly toExclusive: Date;
  }): Promise<readonly MetricsEventRecord[]>;
  countActiveEligibleContacts(): Promise<number>;
  countFailedOutboxJobs(): Promise<number>;
}

function toIso(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ChatMetricsInputError("Unexpected timestamp column value.");
  }
  return date.toISOString();
}

function toOptionalIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIso(value);
}

function toOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function readCount(row: Record<string, unknown> | undefined): number {
  const total = Number(row?.total);
  if (!Number.isInteger(total) || total < 0) {
    throw new ChatMetricsInputError("Unexpected count column value.");
  }
  return total;
}

/** mysql2 adapter for {@link MetricsReportStore} (bound parameters only). */
export function createMetricsReportStore(pool: Pool): MetricsReportStore {
  return {
    async loadConversations(bounds) {
      const [rows] = await pool.execute<RowDataPacket[]>(SELECT_METRICS_CONVERSATIONS_SQL, [
        bounds.from,
        bounds.toExclusive,
        bounds.from,
        bounds.toExclusive,
        CHAT_METRICS_MAX_CONVERSATION_ROWS,
      ]);
      if (!Array.isArray(rows)) {
        throw new ChatMetricsInputError("Unexpected conversation result shape.");
      }
      return rows.map((row) => ({
        id: String((row as { id?: unknown }).id ?? ""),
        createdAt: toIso((row as { created_at?: unknown }).created_at),
        closedAt: toOptionalIso((row as { closed_at?: unknown }).closed_at),
        closeResult: toOptionalString((row as { close_result?: unknown }).close_result),
        firstOperatorResponseAt: toOptionalIso(
          (row as { first_operator_at?: unknown }).first_operator_at
        ),
      }));
    },

    async loadEvents(bounds) {
      const [rows] = await pool.execute<RowDataPacket[]>(SELECT_METRICS_EVENTS_SQL, [
        bounds.from,
        bounds.toExclusive,
        CHAT_METRICS_MAX_EVENT_ROWS,
      ]);
      if (!Array.isArray(rows)) {
        throw new ChatMetricsInputError("Unexpected metric event result shape.");
      }
      return rows.map((row) => ({
        conversationId: toOptionalString((row as { conversation_id?: unknown }).conversation_id),
        eventType: String((row as { event_type?: unknown }).event_type ?? ""),
        senderType: toOptionalString((row as { sender_type?: unknown }).sender_type),
        intent: toOptionalString((row as { intent?: unknown }).intent),
        closeResult: toOptionalString((row as { close_result?: unknown }).close_result),
        occurredAt: toIso((row as { occurred_at?: unknown }).occurred_at),
      }));
    },

    async countActiveEligibleContacts() {
      const [rows] = await pool.execute<RowDataPacket[]>(SELECT_ACTIVE_ELIGIBLE_CONTACTS_SQL, []);
      if (!Array.isArray(rows)) {
        throw new ChatMetricsInputError("Unexpected consent count shape.");
      }
      return readCount(rows[0] as Record<string, unknown> | undefined);
    },

    async countFailedOutboxJobs() {
      const [rows] = await pool.execute<RowDataPacket[]>(SELECT_FAILED_OUTBOX_JOBS_SQL, []);
      if (!Array.isArray(rows)) {
        throw new ChatMetricsInputError("Unexpected outbox count shape.");
      }
      return readCount(rows[0] as Record<string, unknown> | undefined);
    },
  };
}
