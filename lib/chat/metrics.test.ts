import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import type { Pool } from "mysql2/promise";

import {
  CHAT_METRICS_EVENT_TYPES,
  CHAT_METRICS_MAX_CONVERSATION_ROWS,
  CHAT_METRICS_MAX_EVENT_ROWS,
  CHAT_METRICS_MAX_RANGE_DAYS,
  ChatMetricsInputError,
  aggregateChatMetrics,
  buildCleanupCompletedEvent,
  buildConsentGrantedEvent,
  buildConsentRevokedEvent,
  buildConversationClosedEvent,
  buildConversationCreatedEvent,
  buildConversationPurgedEvent,
  buildFirstOperatorResponseEvent,
  buildMessagePersistedEvent,
  buildOutcomeClassifiedEvent,
  buildPresenceExpiredEvent,
  createChatMetricsEventWriter,
  createMetricsReportStore,
  detectDataQualityAlerts,
  listBucketStarts,
  parseMetricsDate,
  parseMetricsGranularity,
  parseMetricsRange,
  parseSlaMinutes,
  writeChatMetricEventBestEffort,
  type ChatMetricsEvent,
  type ChatMetricsEventWriter,
  type ChatMetricsReport,
  type MetricsConversationInput,
  type MetricsEventInput,
} from "./metrics";
import { runRetentionCleanup, type RetentionCandidateStore } from "./retention";

/* ──────────────────────────────────────────────────────────────────────────
 * Reconciliation fixture `LC-WU-12-RECON-5`
 *
 * Five conversations plus a small event set, all timestamps in UTC, inside the
 * inclusive window 2026-03-02 .. 2026-03-08 (Monday..Sunday, UTC).
 * Every expected value below is derived by hand from that window.
 * ────────────────────────────────────────────────────────────────────────── */

const RECON_FIXTURE_ID = "LC-WU-12-RECON-5";
const FROM = "2026-03-02";
const TO = "2026-03-08";

/** Conversations carry PII-shaped extras on purpose: the report must drop them. */
type FixtureConversation = MetricsConversationInput & {
  readonly visitor_name?: string;
  readonly visitor_email?: string;
  readonly visitor_phone?: string;
  readonly close_note?: string;
};

/** Metric rows carry PII-shaped extras on purpose: the report must drop them. */
type FixtureEvent = MetricsEventInput & {
  readonly body?: string;
  readonly token?: string;
  readonly endpoint?: string;
};

const CONVERSATIONS: readonly FixtureConversation[] = [
  {
    id: "conversation-secret-a",
    visitor_name: "Ana García",
    visitor_email: "ana@example.com",
    visitor_phone: "+34600111222",
    close_note: "Resuelto por teléfono",
    createdAt: "2026-03-02T09:00:00.000Z",
    closedAt: "2026-03-02T09:20:00.000Z",
    closeResult: "resuelto",
    firstOperatorResponseAt: "2026-03-02T09:05:00.000Z",
  },
  {
    id: "conversation-secret-b",
    visitor_name: "Bruno Díaz",
    visitor_email: "bruno@example.com",
    createdAt: "2026-03-03T10:00:00.000Z",
    closedAt: "2026-03-03T11:30:00.000Z",
    closeResult: "venta_o_pedido",
    firstOperatorResponseAt: "2026-03-03T11:00:00.000Z",
  },
  {
    id: "conversation-secret-c",
    visitor_name: "Carla Núñez",
    visitor_email: "carla@example.com",
    createdAt: "2026-03-04T08:00:00.000Z",
    closedAt: "2026-03-05T08:00:00.000Z",
    closeResult: "sin_respuesta_de_la_coordinadora",
    firstOperatorResponseAt: null,
  },
  {
    id: "conversation-secret-d",
    visitor_name: "Diego Pérez",
    visitor_email: "diego@example.com",
    createdAt: "2026-03-05T14:00:00.000Z",
    closedAt: "2026-03-05T14:30:00.000Z",
    closeResult: "sin_respuesta_del_cliente",
    firstOperatorResponseAt: "2026-03-05T14:10:00.000Z",
  },
  {
    // Closed without a classification: the data-quality fixture case.
    id: "conversation-secret-e",
    visitor_name: "Elena Ruiz",
    visitor_email: "elena@example.com",
    createdAt: "2026-03-07T10:00:00.000Z",
    closedAt: "2026-03-07T10:30:00.000Z",
    closeResult: null,
    firstOperatorResponseAt: "2026-03-07T10:04:00.000Z",
  },
];

const EVENTS: readonly FixtureEvent[] = [
  // Bot classifications (LC-WU-12 builders, senderType `bot` keeps the intent).
  {
    eventType: "message_persisted",
    senderType: "bot",
    intent: "precios",
    conversationId: "conversation-secret-a",
    occurredAt: "2026-03-02T09:01:00.000Z",
    body: "¿Cuánto cuesta el kilo?",
  },
  {
    eventType: "message_persisted",
    senderType: "bot",
    intent: "horario",
    conversationId: "conversation-secret-c",
    occurredAt: "2026-03-04T08:01:00.000Z",
  },
  {
    eventType: "message_persisted",
    senderType: "bot",
    intent: "como_pedir",
    conversationId: "conversation-secret-d",
    occurredAt: "2026-03-05T14:01:00.000Z",
  },
  {
    eventType: "message_persisted",
    senderType: "bot",
    intent: "postventa",
    conversationId: "conversation-secret-e",
    occurredAt: "2026-03-07T10:01:00.000Z",
  },
  // Legacy LC-WU-10 row shape: classification stored on a handoff (visitor
  // sender). The aggregator must still read its intent code.
  {
    eventType: "message_persisted",
    senderType: "visitor",
    intent: "despachos",
    conversationId: "conversation-secret-b",
    occurredAt: "2026-03-03T10:01:00.000Z",
    token: "resume-token-value",
  },
  {
    eventType: "presence_expired",
    conversationId: "conversation-secret-c",
    occurredAt: "2026-03-04T20:00:00.000Z",
  },
  // Reopen: a second `conversation_created` after the conversation was closed.
  {
    eventType: "conversation_created",
    conversationId: "conversation-secret-d",
    occurredAt: "2026-03-06T14:00:00.000Z",
  },
  // Conversation-independent markers: never conversation-scoped.
  {
    eventType: "conversation_purged",
    conversationId: "conversation-secret-a",
    occurredAt: "2026-03-08T14:00:00.000Z",
    endpoint: "https://push.example.com/endpoint",
  },
  { eventType: "cleanup_completed", occurredAt: "2026-03-08T14:01:00.000Z" },
  { eventType: "consent_granted", occurredAt: "2026-03-02T12:00:00.000Z" },
  { eventType: "consent_revoked", occurredAt: "2026-03-04T12:00:00.000Z" },
  { eventType: "consent_granted", occurredAt: "2026-03-06T12:00:00.000Z" },
];

function reconReport(overrides: Partial<Parameters<typeof aggregateChatMetrics>[0]> = {}) {
  return aggregateChatMetrics({
    conversations: CONVERSATIONS,
    events: EVENTS,
    from: FROM,
    to: TO,
    granularity: "day",
    slaMinutes: null,
    activeEligibleContacts: 5,
    failedOutboxJobs: 0,
    ...overrides,
  });
}

function bucket(report: ChatMetricsReport, bucketStart: string) {
  const found = report.buckets.find((entry) => entry.bucketStart === bucketStart);
  if (found === undefined) throw new Error(`missing bucket ${bucketStart}`);
  return found;
}

/* ── 1. Event emission helpers ──────────────────────────────────────────── */

describe("chat metric event builders", () => {
  const builders: ReadonlyArray<readonly [string, (input: { occurredAt: Date }) => ChatMetricsEvent]> = [
    ["conversation_created", buildConversationCreatedEvent],
    ["message_persisted", (input) => buildMessagePersistedEvent({ ...input, senderType: "bot" })],
    ["first_operator_response", buildFirstOperatorResponseEvent],
    ["presence_expired", buildPresenceExpiredEvent],
    ["conversation_closed", buildConversationClosedEvent],
    ["conversation_purged", buildConversationPurgedEvent],
    ["outcome_classified", (input) => buildOutcomeClassifiedEvent({ ...input, closeResult: "resuelto" })],
    ["consent_granted", buildConsentGrantedEvent],
    ["consent_revoked", buildConsentRevokedEvent],
    ["cleanup_completed", buildCleanupCompletedEvent],
  ];

  it("provides one pure builder for every ENUM event type", () => {
    expect(builders.map(([eventType]) => eventType).sort()).toEqual([...CHAT_METRICS_EVENT_TYPES].sort());
    for (const [eventType, build] of builders) {
      const event = build({ occurredAt: new Date("2026-03-02T09:00:00.000Z") });
      expect(event.eventType).toBe(eventType);
      expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it("normalises occurred_at to the UTC instant of an offset-bearing input", () => {
    const event = buildConversationCreatedEvent({ occurredAt: "2026-03-02T23:30:00-05:00" });
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.occurredAt.toISOString()).toBe("2026-03-03T04:30:00.000Z");
  });

  it("rejects an invalid occurred_at instead of writing a broken timestamp", () => {
    for (const bad of ["not-a-date", "2026-13-45T99:00:00Z"]) {
      expect(() => buildConversationCreatedEvent({ occurredAt: bad })).toThrow(ChatMetricsInputError);
    }
    expect(() => buildConversationCreatedEvent({ occurredAt: new Date(Number.NaN) })).toThrow(
      ChatMetricsInputError
    );
  });

  it("carries the intent only for bot-authored message events", () => {
    const bot = buildMessagePersistedEvent({
      conversationId: "conv-1",
      senderType: "bot",
      intent: "precios",
      occurredAt: new Date("2026-03-02T09:00:00.000Z"),
    });
    expect(bot.intent).toBe("precios");

    for (const senderType of ["visitor", "operator"] as const) {
      const event = buildMessagePersistedEvent({
        conversationId: "conv-1",
        senderType,
        intent: "precios",
        occurredAt: new Date("2026-03-02T09:00:00.000Z"),
      });
      expect(event.intent).toBeNull();
    }

    const closed = buildConversationClosedEvent({
      conversationId: "conv-1",
      intent: "precios",
      occurredAt: new Date("2026-03-02T09:00:00.000Z"),
    });
    expect(closed.intent).toBeNull();
  });

  it("carries close_result only on outcome_classified and requires it there", () => {
    const classified = buildOutcomeClassifiedEvent({
      conversationId: "conv-1",
      closeResult: "venta_o_pedido",
      occurredAt: new Date("2026-03-02T09:00:00.000Z"),
    });
    expect(classified.closeResult).toBe("venta_o_pedido");

    const closed = buildConversationClosedEvent({
      conversationId: "conv-1",
      closeResult: "resuelto",
      occurredAt: new Date("2026-03-02T09:00:00.000Z"),
    });
    expect(closed.closeResult).toBeNull();

    expect(() =>
      buildOutcomeClassifiedEvent({ conversationId: "conv-1", occurredAt: new Date() })
    ).toThrow(ChatMetricsInputError);
    expect(() =>
      buildOutcomeClassifiedEvent({
        conversationId: "conv-1",
        closeResult: "aprobado",
        occurredAt: new Date(),
      })
    ).toThrow(ChatMetricsInputError);
  });

  it("keeps purged, consent and cleanup markers independent of any conversation", () => {
    for (const build of [
      buildConversationPurgedEvent,
      buildConsentGrantedEvent,
      buildConsentRevokedEvent,
      buildCleanupCompletedEvent,
    ]) {
      const event = build({
        conversationId: "conversation-secret-a",
        occurredAt: new Date("2026-03-02T09:00:00.000Z"),
      });
      expect(event.conversationId).toBeNull();
    }
  });

  it("emits only the fixed metric columns (no body, contact data or push endpoint)", () => {
    const event = buildMessagePersistedEvent({
      conversationId: "conv-1",
      senderType: "bot",
      intent: "precios",
      occurredAt: new Date("2026-03-02T09:00:00.000Z"),
    });
    expect(Object.keys(event).sort()).toEqual([
      "closeResult",
      "conversationId",
      "eventType",
      "id",
      "intent",
      "occurredAt",
      "senderType",
    ]);
  });

  it("rejects a malformed conversation id", () => {
    for (const conversationId of ["", "  padded  ", "x".repeat(192)]) {
      expect(() =>
        buildConversationCreatedEvent({ conversationId, occurredAt: new Date() })
      ).toThrow(ChatMetricsInputError);
    }
  });
});

/* ── 2. Best-effort emission ────────────────────────────────────────────── */

describe("writeChatMetricEventBestEffort", () => {
  it("resolves true when the writer accepted the event", async () => {
    const insertEvent = vi.fn().mockResolvedValue(undefined);
    const event = buildCleanupCompletedEvent({ occurredAt: new Date() });
    await expect(writeChatMetricEventBestEffort({ insertEvent }, event)).resolves.toBe(true);
    expect(insertEvent).toHaveBeenCalledWith(event);
  });

  it("swallows a writer failure so the primary operation never fails", async () => {
    const writer: ChatMetricsEventWriter = {
      insertEvent: vi.fn().mockRejectedValue(new Error("db down")),
    };
    await expect(
      writeChatMetricEventBestEffort(writer, buildCleanupCompletedEvent({ occurredAt: new Date() }))
    ).resolves.toBe(false);
  });
});

/* ── 3. Range, granularity and parameter parsing ────────────────────────── */

describe("metrics range parsing", () => {
  it("accepts a strict UTC date and rejects anything else", () => {
    expect(parseMetricsDate("2026-03-02")).toBe("2026-03-02");
    for (const bad of [null, "", "2026-3-2", "2026-03-02T00:00:00Z", "2026-02-30", "not-a-date"]) {
      expect(parseMetricsDate(bad)).toBeNull();
    }
  });

  it("bounds a report window at 366 days and keeps order strict", () => {
    expect(CHAT_METRICS_MAX_RANGE_DAYS).toBe(366);
    expect(parseMetricsRange("2026-01-01", "2026-12-31")).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
    // 2025 is not a leap year: Jan 1 2025 .. Jan 1 2026 = 366 days (accepted),
    // one day more is rejected.
    expect(parseMetricsRange("2025-01-01", "2026-01-01")).toEqual({
      from: "2025-01-01",
      to: "2026-01-01",
    });
    expect(parseMetricsRange("2025-01-01", "2026-01-02")).toBeNull();
    expect(parseMetricsRange("2026-03-08", "2026-03-02")).toBeNull();
    expect(parseMetricsRange("2026-03-02", "2026-03-08")).toEqual({
      from: "2026-03-02",
      to: "2026-03-08",
    });
  });

  it("defaults granularity to day and rejects unknown values", () => {
    expect(parseMetricsGranularity(null)).toEqual({ ok: true, value: "day" });
    expect(parseMetricsGranularity("week")).toEqual({ ok: true, value: "week" });
    expect(parseMetricsGranularity("month")).toEqual({ ok: true, value: "month" });
    expect(parseMetricsGranularity("hour")).toEqual({ ok: false });
    expect(parseMetricsGranularity("")).toEqual({ ok: false });
  });

  it("treats an absent SLA as pending and rejects a malformed one", () => {
    expect(parseSlaMinutes(null)).toEqual({ ok: true, value: null });
    expect(parseSlaMinutes("15")).toEqual({ ok: true, value: 15 });
    expect(parseSlaMinutes("0")).toEqual({ ok: false });
    expect(parseSlaMinutes("-5")).toEqual({ ok: false });
    expect(parseSlaMinutes("abc")).toEqual({ ok: false });
    expect(parseSlaMinutes("10081")).toEqual({ ok: false });
  });

  it("lists every UTC bucket start covering a window", () => {
    expect(listBucketStarts("2026-03-02", "2026-03-08", "day")).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
    ]);
    // 2026-03-02 is a Monday, so the whole window is a single ISO week.
    expect(listBucketStarts("2026-03-02", "2026-03-08", "week")).toEqual(["2026-03-02"]);
    expect(listBucketStarts("2026-03-02", "2026-03-08", "month")).toEqual(["2026-03"]);
    expect(listBucketStarts("2026-02-24", "2026-03-02", "month")).toEqual(["2026-02", "2026-03"]);
    expect(listBucketStarts("2026-03-06", "2026-03-02", "day")).toEqual([]);
  });
});

/* ── 4. Reconciliation fixture ──────────────────────────────────────────── */

describe(`reconciliation fixture ${RECON_FIXTURE_ID}`, () => {
  it("reconciles started/closed/purged counts and daily windows", () => {
    const report = reconReport();

    expect(report.range).toEqual({ from: FROM, to: TO, granularity: "day" });
    expect(report.buckets).toHaveLength(7);

    expect(report.summary.started).toBe(5);
    expect(report.summary.closed).toBe(5);
    expect(report.summary.purged).toBe(1);
    expect(report.summary.reopened).toBe(1);
    expect(report.summary.presenceExpired).toBe(1);

    expect(bucket(report, "2026-03-02").started).toBe(1);
    expect(bucket(report, "2026-03-02").closed).toBe(1);
    expect(bucket(report, "2026-03-05").closed).toBe(2);
    expect(bucket(report, "2026-03-05").started).toBe(1);
    // A reopen is not a new chat: it is reported as `reopened` only.
    expect(bucket(report, "2026-03-06").started).toBe(0);
    expect(bucket(report, "2026-03-06").reopened).toBe(1);
    expect(bucket(report, "2026-03-08").purged).toBe(1);
    expect(bucket(report, "2026-03-08").cleanupRuns).toBe(1);
  });

  it("reconciles the result distribution and the success-rate denominator", () => {
    const report = reconReport();

    expect(report.summary.classifiedClosed).toBe(4);
    expect(report.summary.closeResults).toEqual({
      resuelto: 1,
      venta_o_pedido: 1,
      sin_respuesta_de_la_coordinadora: 1,
      sin_respuesta_del_cliente: 1,
    });
    expect(report.summary.successCount).toBe(2);
    expect(report.summary.successRate).toBe(0.5);
    expect(report.summary.coordinatorUnanswered).toBe(1);
    expect(report.summary.visitorAbandoned).toBe(1);

    // The unclassified close never enters the denominator.
    expect(bucket(report, "2026-03-07").classifiedClosed).toBe(0);
    expect(bucket(report, "2026-03-07").successRate).toBeNull();
    expect(bucket(report, "2026-03-07").closeResults).toEqual({});
  });

  it("reconciles first-response median/p90 and time-to-close windows", () => {
    const report = reconReport();

    // Latencies (s): 300, 3600, 600, 240 → sorted 240, 300, 600, 3600.
    expect(report.summary.firstResponse).toEqual({ count: 4, medianSeconds: 450, p90Seconds: 3600 });
    // Latencies (s): 1200, 5400, 86400, 1800, 1800 → sorted 1200, 1800, 1800, 5400, 86400.
    expect(report.summary.timeToClose).toEqual({ count: 5, medianSeconds: 1800, p90Seconds: 86400 });

    expect(bucket(report, "2026-03-02").firstResponse).toEqual({
      count: 1,
      medianSeconds: 300,
      p90Seconds: 300,
    });
    expect(bucket(report, "2026-03-05").timeToClose).toEqual({
      count: 2,
      medianSeconds: 44100,
      p90Seconds: 86400,
    });
    // The conversation closed without a coordinator answer has no first response.
    expect(bucket(report, "2026-03-04").firstResponse.count).toBe(0);
  });

  it("reconciles bot escalations, intent distribution and consent counters", () => {
    const report = reconReport();

    expect(report.summary.botEscalations).toBe(1);
    expect(bucket(report, "2026-03-03").botEscalations).toBe(1);

    expect(report.summary.intents).toEqual({
      precios: 1,
      despachos: 1,
      horario: 1,
      como_pedir: 1,
      postventa: 1,
    });

    expect(report.summary.consentGranted).toBe(2);
    expect(report.summary.consentRevoked).toBe(1);
    expect(report.summary.activeEligibleContacts).toBe(5);
    expect(bucket(report, "2026-03-04").consentRevoked).toBe(1);
    expect(bucket(report, "2026-03-06").consentGranted).toBe(1);
  });

  it("aggregates the same window as one bucket per week and per month", () => {
    const weekly = reconReport({ granularity: "week" });
    expect(weekly.buckets).toHaveLength(1);
    expect(weekly.buckets[0].bucketStart).toBe("2026-03-02");
    expect(weekly.buckets[0].started).toBe(5);
    expect(weekly.buckets[0].successRate).toBe(0.5);
    expect(weekly.buckets[0].firstResponse.medianSeconds).toBe(450);

    const monthly = reconReport({ granularity: "month" });
    expect(monthly.buckets).toHaveLength(1);
    expect(monthly.buckets[0].bucketStart).toBe("2026-03");
    expect(monthly.buckets[0].closed).toBe(5);
    expect(monthly.buckets[0].purged).toBe(1);
  });

  it("buckets by UTC day, never by the host timezone", () => {
    const report = aggregateChatMetrics({
      conversations: [],
      events: [
        {
          eventType: "consent_granted",
          occurredAt: "2026-03-02T23:30:00.000Z",
        },
      ],
      from: FROM,
      to: TO,
      granularity: "day",
      slaMinutes: null,
      activeEligibleContacts: 0,
      failedOutboxJobs: 0,
    });
    expect(bucket(report, "2026-03-02").consentGranted).toBe(1);
    expect(bucket(report, "2026-03-03").consentGranted).toBe(0);
  });

  it("ignores rows outside the requested window", () => {
    const report = reconReport({ from: "2026-03-06", to: "2026-03-08" });
    expect(report.buckets).toHaveLength(3);
    // Only conv-e starts and closes inside this sub-window.
    expect(report.summary.started).toBe(1);
    expect(report.summary.closed).toBe(1);
    expect(report.summary.purged).toBe(1);
    expect(report.summary.consentGranted).toBe(1);
    expect(report.summary.reopened).toBe(1);
    expect(report.summary.closeResults).toEqual({});
    expect(report.summary.intents).toEqual({ postventa: 1 });
    expect(report.summary.timeToClose.count).toBe(1);
    expect(report.summary.firstResponse.count).toBe(1);
  });
});

/* ── 5. SLA (D3 open) ───────────────────────────────────────────────────── */

describe("SLA compliance (D3)", () => {
  it("requires the SLA parameter explicitly and never invents a default", () => {
    const complete: Parameters<typeof aggregateChatMetrics>[0] = {
      conversations: CONVERSATIONS,
      events: EVENTS,
      from: FROM,
      to: TO,
      granularity: "day",
      slaMinutes: null,
      activeEligibleContacts: 5,
      failedOutboxJobs: 0,
    };
    const withoutSla: Record<string, unknown> = { ...complete };
    delete withoutSla.slaMinutes;
    expect(() =>
      aggregateChatMetrics(withoutSla as Parameters<typeof aggregateChatMetrics>[0])
    ).toThrow(ChatMetricsInputError);
  });

  it("reports slaPending instead of a final KPI while D3 is open", () => {
    const report = reconReport({ slaMinutes: null });
    expect(report.slaPending).toBe(true);
    expect(report.slaCompliance).toBeNull();
  });

  it("computes attainment only when an SLA value is supplied", () => {
    const report = reconReport({ slaMinutes: 15 });
    expect(report.slaPending).toBe(false);
    expect(report.slaCompliance).toEqual({
      slaMinutes: 15,
      measured: 4,
      withinSla: 3,
      rate: 0.75,
    });

    const strict = reconReport({ slaMinutes: 60 });
    expect(strict.slaCompliance).toEqual({
      slaMinutes: 60,
      measured: 4,
      withinSla: 4,
      rate: 1,
    });
  });

  it("rejects a malformed SLA value instead of guessing", () => {
    for (const slaMinutes of [0, -1, 1.5, Number.NaN] as const) {
      expect(() => reconReport({ slaMinutes })).toThrow(ChatMetricsInputError);
    }
  });

  it("reports a null attainment rate when nothing was measured", () => {
    const report = reconReport({
      slaMinutes: 15,
      conversations: [{ id: "conversation-secret-c", createdAt: "2026-03-04T08:00:00.000Z" }],
      events: [],
    });
    expect(report.summary.firstResponse.count).toBe(0);
    expect(report.slaCompliance).toEqual({ slaMinutes: 15, measured: 0, withinSla: 0, rate: null });
  });
});

/* ── 6. Privacy of the report payload ───────────────────────────────────── */

describe("report privacy", () => {
  const forbiddenKeys = [
    "id",
    "conversationId",
    "body",
    "email",
    "phone",
    "token",
    "endpoint",
    "name",
    "visitorName",
    "visitor_name",
    "visitor_email",
    "visitor_phone",
    "closeNote",
    "senderName",
    "operatorId",
    "handle",
    "conversationHandle",
  ];

  function walkKeys(value: unknown, found: Set<string> = new Set()): Set<string> {
    if (Array.isArray(value)) {
      for (const entry of value) walkKeys(entry, found);
      return found;
    }
    if (value !== null && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        found.add(key);
        walkKeys(entry, found);
      }
    }
    return found;
  }

  it("emits only counts, codes and dates for the whole fixture", () => {
    const report = reconReport({ slaMinutes: 15 });
    const serialized = JSON.stringify(report);

    for (const key of forbiddenKeys) expect(walkKeys(report).has(key)).toBe(false);

    for (const pii of [
      "conversation-secret",
      "ana@example.com",
      "bruno@example.com",
      "+34600111222",
      "Ana García",
      "Resuelto por teléfono",
      "¿Cuánto cuesta el kilo?",
      "resume-token-value",
      "https://push.example.com/endpoint",
    ]) {
      expect(serialized).not.toContain(pii);
    }

    // Codes and dates do appear: they are the report's vocabulary.
    expect(serialized).toContain("2026-03-02");
    expect(serialized).toContain("resuelto");
    expect(serialized).toContain("precios");
    expect(report.slaCompliance).not.toBeNull();
  });

  it("drops free-form intent values that are not codes", () => {
    const report = aggregateChatMetrics({
      conversations: [],
      events: [
        {
          eventType: "message_persisted",
          senderType: "bot",
          intent: "ana@example.com",
          occurredAt: "2026-03-02T09:00:00.000Z",
        },
        {
          eventType: "message_persisted",
          senderType: "bot",
          intent: "precios",
          occurredAt: "2026-03-02T09:01:00.000Z",
        },
      ],
      from: FROM,
      to: TO,
      granularity: "day",
      slaMinutes: null,
      activeEligibleContacts: 0,
      failedOutboxJobs: 0,
    });
    expect(report.summary.intents).toEqual({ precios: 1 });
    expect(JSON.stringify(report)).not.toContain("ana@example.com");
  });

  it("ignores unknown close-result values instead of echoing them", () => {
    const report = aggregateChatMetrics({
      conversations: [
        {
          id: "conversation-secret-x",
          createdAt: "2026-03-02T09:00:00.000Z",
          closedAt: "2026-03-02T10:00:00.000Z",
          closeResult: "aprobado_por_alguien",
        },
      ],
      events: [],
      from: FROM,
      to: TO,
      granularity: "day",
      slaMinutes: null,
      activeEligibleContacts: 0,
      failedOutboxJobs: 0,
    });
    expect(report.summary.closeResults).toEqual({});
    expect(report.summary.classifiedClosed).toBe(0);
    expect(report.summary.unclassifiedClosed).toBe(1);
    expect(JSON.stringify(report)).not.toContain("aprobado_por_alguien");
  });
});

/* ── 7. Data-quality alerts ─────────────────────────────────────────────── */

describe("data-quality alerts", () => {
  it("flags unclassified closes and missing first-response timestamps", () => {
    const alerts = detectDataQualityAlerts({
      unclassifiedClosed: 2,
      missingFirstResponse: 1,
      failedOutboxJobs: 0,
      failedCleanupRuns: 0,
    });
    expect(alerts.map((alert) => alert.code)).toEqual([
      "unclassified_closed",
      "missing_first_response",
    ]);
    expect(alerts[0]).toEqual({ code: "unclassified_closed", count: 2, threshold: 0 });
    expect(alerts[1]).toEqual({ code: "missing_first_response", count: 1, threshold: 0 });
  });

  it("flags failed outbox and cleanup jobs", () => {
    const alerts = detectDataQualityAlerts({
      unclassifiedClosed: 0,
      missingFirstResponse: 0,
      failedOutboxJobs: 3,
      failedCleanupRuns: 1,
    });
    expect(alerts.map((alert) => alert.code)).toEqual(["failed_outbox_jobs", "failed_cleanup_runs"]);
    expect(alerts[0].count).toBe(3);
    expect(alerts[1].count).toBe(1);
  });

  it("stays silent when every counter is clean", () => {
    expect(
      detectDataQualityAlerts({
        unclassifiedClosed: 0,
        missingFirstResponse: 0,
        failedOutboxJobs: 0,
        failedCleanupRuns: 0,
      })
    ).toEqual([]);
  });

  it("derives the fixture's unclassified close as an alert", () => {
    const report = reconReport({ failedOutboxJobs: 2 });
    expect(report.summary.unclassifiedClosed).toBe(1);
    expect(report.summary.missingFirstResponse).toBe(0);
    expect(report.summary.failedOutboxJobs).toBe(2);
    // Purges exist AND a cleanup run completed → no cleanup failure.
    expect(report.summary.cleanupRunsFailed).toBe(0);
    expect(report.alerts.map((alert) => alert.code)).toEqual([
      "unclassified_closed",
      "failed_outbox_jobs",
    ]);
  });

  it("treats purges without a completed cleanup run as a failed cleanup job", () => {
    const report = aggregateChatMetrics({
      conversations: [],
      events: [{ eventType: "conversation_purged", occurredAt: "2026-03-08T14:00:00.000Z" }],
      from: FROM,
      to: TO,
      granularity: "day",
      slaMinutes: null,
      activeEligibleContacts: 0,
      failedOutboxJobs: 0,
    });
    expect(report.summary.cleanupRuns).toBe(0);
    expect(report.summary.cleanupRunsFailed).toBe(1);
    expect(report.alerts.map((alert) => alert.code)).toEqual(["failed_cleanup_runs"]);
  });
});

/* ── 8. Report store ────────────────────────────────────────────────────── */

type StoredCall = { readonly sql: string; readonly params: readonly unknown[] };

function fakePool(responses: Array<unknown[]>) {
  const calls: StoredCall[] = [];
  const pool = {
    async execute(sql: string, params: readonly unknown[]) {
      calls.push({ sql, params });
      const next = responses.shift() ?? [];
      return [next];
    },
  };
  return { pool: pool as unknown as Pool, calls };
}

describe("createMetricsReportStore", () => {
  it("reads conversations with their first operator response, bound only", async () => {
    const { pool, calls } = fakePool([
      [
        {
          id: "conversation-secret-a",
          created_at: new Date("2026-03-02T09:00:00.000Z"),
          closed_at: new Date("2026-03-02T09:20:00.000Z"),
          close_result: "resuelto",
          first_operator_at: new Date("2026-03-02T09:05:00.000Z"),
        },
      ],
    ]);
    const store = createMetricsReportStore(pool);

    const rows = await store.loadConversations({
      from: new Date("2026-03-02T00:00:00.000Z"),
      toExclusive: new Date("2026-03-09T00:00:00.000Z"),
    });

    expect(rows).toEqual([
      {
        id: "conversation-secret-a",
        createdAt: "2026-03-02T09:00:00.000Z",
        closedAt: "2026-03-02T09:20:00.000Z",
        closeResult: "resuelto",
        firstOperatorResponseAt: "2026-03-02T09:05:00.000Z",
      },
    ]);
    const call = calls[0];
    expect(call.sql).toContain("FROM chat_conversations");
    expect(call.sql).toContain("sender_type = 'operator'");
    expect(call.sql).not.toContain("2026-03-02");
    expect(call.params).toEqual([
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-09T00:00:00.000Z"),
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-09T00:00:00.000Z"),
      CHAT_METRICS_MAX_CONVERSATION_ROWS,
    ]);
  });

  it("reads metric events and the two count snapshots with bound parameters", async () => {
    const { pool, calls } = fakePool([
      [
        {
          conversation_id: "conversation-secret-a",
          event_type: "message_persisted",
          sender_type: "bot",
          intent: "precios",
          close_result: null,
          occurred_at: new Date("2026-03-02T09:01:00.000Z"),
        },
      ],
      [{ total: 5 }],
      [{ total: 2 }],
    ]);
    const store = createMetricsReportStore(pool);

    const events = await store.loadEvents({
      from: new Date("2026-03-02T00:00:00.000Z"),
      toExclusive: new Date("2026-03-09T00:00:00.000Z"),
    });
    expect(events).toEqual([
      {
        conversationId: "conversation-secret-a",
        eventType: "message_persisted",
        senderType: "bot",
        intent: "precios",
        closeResult: null,
        occurredAt: "2026-03-02T09:01:00.000Z",
      },
    ]);
    expect(calls[0].sql).toContain("FROM chat_metrics_events");
    expect(calls[0].sql).toContain("occurred_at >= ?");
    expect(calls[0].sql).not.toContain("2026-03-02");
    expect(calls[0].params).toEqual([
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-09T00:00:00.000Z"),
      CHAT_METRICS_MAX_EVENT_ROWS,
    ]);

    await expect(store.countActiveEligibleContacts()).resolves.toBe(5);
    expect(calls[1].sql).toContain("FROM chat_contact_consents");
    expect(calls[1].sql).toContain("consent_state = 'granted'");

    await expect(store.countFailedOutboxJobs()).resolves.toBe(2);
    expect(calls[2].sql).toContain("FROM chat_email_outbox");
    expect(calls[2].sql).toContain("status = 'failed'");
  });

  it("rejects a malformed count row instead of reporting nonsense", async () => {
    const { pool } = fakePool([[{ total: "not-a-number" }]]);
    await expect(createMetricsReportStore(pool).countActiveEligibleContacts()).rejects.toThrow(
      ChatMetricsInputError
    );
  });

  it("inserts an emitted event with bound parameters only", async () => {
    const { pool, calls } = fakePool([[]]);
    const writer = createChatMetricsEventWriter(pool);
    const event = buildCleanupCompletedEvent({ occurredAt: new Date("2026-03-08T14:01:00.000Z") });

    await writer.insertEvent(event);

    expect(calls[0].sql).toBe(
      "INSERT INTO chat_metrics_events " +
        "(id, conversation_id, event_type, sender_type, intent, close_result, occurred_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    expect(calls[0].sql).not.toContain(event.id);
    expect(calls[0].params).toEqual([
      event.id,
      null,
      "cleanup_completed",
      null,
      null,
      null,
      new Date("2026-03-08T14:01:00.000Z"),
    ]);
  });
});

/* ── 9. Retention cleanup wiring ────────────────────────────────────────── */

function fakePurgeDatabase() {
  return {
    transactions: 0,
    async transaction<T>(work: (connection: {
      execute(sql: string, params: readonly unknown[]): Promise<{ affectedRows: number }>;
    }) => Promise<T>): Promise<T> {
      this.transactions += 1;
      return await work({ execute: async () => ({ affectedRows: 1 }) });
    },
  };
}

function fakeCandidateStore(ids: readonly string[]): RetentionCandidateStore {
  return { listCandidates: vi.fn().mockResolvedValue(ids) };
}

describe("runRetentionCleanup metric wiring", () => {
  const NOW = new Date("2026-10-10T00:00:00.000Z");
  const CONVERSATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  it("writes no metric event unless a writer is supplied", async () => {
    const insertEvent = vi.fn();
    await runRetentionCleanup({
      store: fakeCandidateStore([CONVERSATION_ID]),
      purgeDatabase: fakePurgeDatabase(),
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("emits one purge marker per purged conversation and one completion per run", async () => {
    const insertEvent = vi.fn().mockResolvedValue(undefined);
    const purgeDatabase = fakePurgeDatabase();

    const report = await runRetentionCleanup({
      store: fakeCandidateStore([CONVERSATION_ID, "8b7d2a44-1111-4222-8333-444455556666"]),
      purgeDatabase,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
      metrics: { insertEvent },
    });

    expect(report).toEqual({ scanned: 2, purged: 2, skipped_open: 0, dryRun: false });
    expect(insertEvent).toHaveBeenCalledTimes(3);

    const purgeEvents = insertEvent.mock.calls
      .map((call) => call[0] as ChatMetricsEvent)
      .filter((event) => event.eventType === "conversation_purged");
    expect(purgeEvents).toHaveLength(2);
    for (const event of purgeEvents) {
      // Never conversation-scoped: the purge cascades conversation rows away.
      expect(event.conversationId).toBeNull();
      expect(event.occurredAt.toISOString()).toBe(NOW.toISOString());
    }

    const completion = insertEvent.mock.calls
      .map((call) => call[0] as ChatMetricsEvent)
      .filter((event) => event.eventType === "cleanup_completed");
    expect(completion).toHaveLength(1);
    expect(completion[0].conversationId).toBeNull();
  });

  it("never fails the primary cleanup when the metric write fails", async () => {
    const insertEvent = vi.fn().mockRejectedValue(new Error("metrics down"));
    const report = await runRetentionCleanup({
      store: fakeCandidateStore([CONVERSATION_ID]),
      purgeDatabase: fakePurgeDatabase(),
      olderThanDays: 30,
      limit: 10,
      now: NOW,
      metrics: { insertEvent },
    });
    expect(report).toEqual({ scanned: 1, purged: 1, skipped_open: 0, dryRun: false });
  });

  it("emits nothing on a dry run", async () => {
    const insertEvent = vi.fn().mockResolvedValue(undefined);
    await runRetentionCleanup({
      store: fakeCandidateStore([CONVERSATION_ID]),
      purgeDatabase: fakePurgeDatabase(),
      olderThanDays: 30,
      limit: 10,
      now: NOW,
      dryRun: true,
      metrics: { insertEvent },
    });
    expect(insertEvent).not.toHaveBeenCalled();
  });
});
