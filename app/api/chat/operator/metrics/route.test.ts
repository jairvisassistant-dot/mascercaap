import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";

type MockStore = {
  loadConversations: ReturnType<typeof vi.fn>;
  loadEvents: ReturnType<typeof vi.fn>;
  countActiveEligibleContacts: ReturnType<typeof vi.fn>;
  countFailedOutboxJobs: ReturnType<typeof vi.fn>;
};

type LoadOptions = {
  enabled?: boolean;
  store?: MockStore;
  authStatus?: number | null;
  failingStore?: MockStore;
};

/** Store rows deliberately carry PII-shaped extras: the payload must drop them. */
function defaultStore(): MockStore {
  return {
    loadConversations: vi.fn().mockResolvedValue([
      {
        id: "conversation-secret-a",
        createdAt: "2026-03-02T09:00:00.000Z",
        closedAt: "2026-03-02T09:20:00.000Z",
        closeResult: "resuelto",
        firstOperatorResponseAt: "2026-03-02T09:05:00.000Z",
        visitor_name: "Ana García",
        visitor_email: "ana@example.com",
        visitor_phone: "+34600111222",
      },
    ]),
    loadEvents: vi.fn().mockResolvedValue([
      {
        conversationId: "conversation-secret-a",
        eventType: "message_persisted",
        senderType: "bot",
        intent: "precios",
        closeResult: null,
        occurredAt: "2026-03-02T09:01:00.000Z",
        body: "¿Cuánto cuesta el kilo?",
        token: "resume-token-value",
      },
    ]),
    countActiveEligibleContacts: vi.fn().mockResolvedValue(4),
    countFailedOutboxJobs: vi.fn().mockResolvedValue(0),
  };
}

function failingStore(): MockStore {
  return {
    loadConversations: vi.fn().mockRejectedValue(new Error("boom")),
    loadEvents: vi.fn().mockResolvedValue([]),
    countActiveEligibleContacts: vi.fn().mockResolvedValue(0),
    countFailedOutboxJobs: vi.fn().mockResolvedValue(0),
  };
}

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store = options.store ?? options.failingStore ?? defaultStore();
  const auth = vi
    .fn()
    .mockResolvedValue(
      options.authStatus == null
        ? null
        : NextResponse.json({ error: "boundary" }, { status: options.authStatus })
    );

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/operator-auth", () => ({
    requireOperatorAuth: auth,
    getOperatorIdentity: () => ({ operatorId: "coordinator@example.com", senderType: "operator" }),
    OPERATOR_SENDER_TYPE: "operator",
  }));
  vi.doMock("@/lib/chat/metrics", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/metrics")>();
    return { ...actual, createMetricsReportStore: () => store };
  });

  const route = await import("./route");
  return { GET: route.GET, store, auth };
}

const VALID_ORIGIN = "https://mascercaap.com";

function getRequest(query: string, origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return new Request(`http://localhost/api/chat/operator/metrics${query}`, { headers });
}

function metricsRequest(
  query = "?from=2026-03-02&to=2026-03-08",
  origin: string | null = VALID_ORIGIN
): Request {
  return getRequest(query, origin);
}

describe("GET /api/chat/operator/metrics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/operator-auth");
    vi.doUnmock("@/lib/chat/metrics");
  });

  it("returns a generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ enabled: false });
    const res = await GET(metricsRequest());
    expect(res.status).toBe(404);
    expect(store.loadConversations).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute();
    const res = await GET(metricsRequest("?from=2026-03-02&to=2026-03-08", "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.loadConversations).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with the boundary status", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ authStatus: 401 });
    const res = await GET(metricsRequest());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(store.loadConversations).not.toHaveBeenCalled();
  });

  it("rejects a malformed window with an opaque 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute();
    for (const query of [
      "",
      "?from=2026-03-02",
      "?to=2026-03-08",
      "?from=2026-03-08&to=2026-03-02",
      "?from=2026-02-30&to=2026-03-08",
      "?from=2026-01-01&to=2026-12-31&x=1",
      "?from=2025-01-01&to=2026-01-02",
      "?from=2026-03-02&to=2026-03-08&granularity=hour",
      "?from=2026-03-02&to=2026-03-08&slaMinutes=0",
      "?from=2026-03-02&to=2026-03-08&slaMinutes=abc",
    ]) {
      const res = await GET(metricsRequest(query));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        success: false,
        error: CHAT_GENERIC_ERROR_CODE,
      });
    }
    expect(store.loadConversations).not.toHaveBeenCalled();
  });

  it("serves an aggregate-only report with no-store headers", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute();
    const res = await GET(metricsRequest("?from=2026-03-02&to=2026-03-08&granularity=day"));

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const payload = (await res.json()) as {
      success: boolean;
      data: {
        range: { from: string; to: string; granularity: string };
        buckets: Array<{ bucketStart: string }>;
        summary: {
          started: number;
          closed: number;
          classifiedClosed: number;
          successRate: number | null;
          intents: Record<string, number>;
          activeEligibleContacts: number;
        };
        slaCompliance: unknown;
        slaPending: boolean;
        alerts: Array<{ code: string }>;
      };
    };

    expect(payload.success).toBe(true);
    expect(payload.data.range).toEqual({ from: "2026-03-02", to: "2026-03-08", granularity: "day" });
    expect(payload.data.buckets).toHaveLength(7);
    expect(payload.data.summary.started).toBe(1);
    expect(payload.data.summary.closed).toBe(1);
    expect(payload.data.summary.classifiedClosed).toBe(1);
    expect(payload.data.summary.successRate).toBe(1);
    expect(payload.data.summary.intents).toEqual({ precios: 1 });
    expect(payload.data.summary.activeEligibleContacts).toBe(4);
    expect(payload.data.alerts).toEqual([]);

    // D3 is open: no SLA value in the request → no final KPI in the payload.
    expect(payload.data.slaPending).toBe(true);
    expect(payload.data.slaCompliance).toBeNull();

    // Rows carried id/email/phone/body/token; the payload must not.
    const serialized = JSON.stringify(payload);
    for (const pii of [
      "conversation-secret",
      "ana@example.com",
      "+34600111222",
      "Ana García",
      "¿Cuánto cuesta el kilo?",
      "resume-token-value",
    ]) {
      expect(serialized).not.toContain(pii);
    }
    expect(serialized).toContain("2026-03-02");
    expect(serialized).toContain("resuelto");

    // The window is converted to UTC-midnight bounds and never interpolated.
    expect(store.loadConversations).toHaveBeenCalledWith({
      from: new Date("2026-03-02T00:00:00.000Z"),
      toExclusive: new Date("2026-03-09T00:00:00.000Z"),
    });
    expect(store.loadEvents).toHaveBeenCalledWith({
      from: new Date("2026-03-02T00:00:00.000Z"),
      toExclusive: new Date("2026-03-09T00:00:00.000Z"),
    });
    expect(store.countActiveEligibleContacts).toHaveBeenCalledTimes(1);
    expect(store.countFailedOutboxJobs).toHaveBeenCalledTimes(1);
  });

  it("defaults to daily buckets and reports SLA attainment only when asked", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET } = await loadRoute();
    const res = await GET(metricsRequest("?from=2026-03-02&to=2026-03-08&slaMinutes=15"));
    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      data: {
        range: { granularity: string };
        slaPending: boolean;
        slaCompliance: { slaMinutes: number; measured: number; withinSla: number; rate: number };
      };
    };
    expect(payload.data.range.granularity).toBe("day");
    expect(payload.data.slaPending).toBe(false);
    expect(payload.data.slaCompliance).toEqual({
      slaMinutes: 15,
      measured: 1,
      withinSla: 1,
      rate: 1,
    });
  });

  it("supports weekly and monthly aggregation", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    for (const [granularity, expected] of [
      ["week", "2026-03-02"],
      ["month", "2026-03"],
    ] as const) {
      const { GET } = await loadRoute();
      const res = await GET(
        metricsRequest(`?from=2026-03-02&to=2026-03-08&granularity=${granularity}`)
      );
      expect(res.status).toBe(200);
      const payload = (await res.json()) as { data: { buckets: Array<{ bucketStart: string }> } };
      expect(payload.data.buckets).toHaveLength(1);
      expect(payload.data.buckets[0].bucketStart).toBe(expected);
    }
  });

  it("returns a generic 503 on a database failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET } = await loadRoute({ failingStore: failingStore() });
    const res = await GET(metricsRequest());
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
  });
});
