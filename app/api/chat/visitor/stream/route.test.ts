import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

type FakeSubscription = {
  scope: string;
  listen: ReturnType<typeof vi.fn>;
  recordHeartbeat: ReturnType<typeof vi.fn>;
  recordExpiration: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

function createSubscription(scope: string): FakeSubscription {
  return {
    scope,
    listen: vi.fn(),
    recordHeartbeat: vi.fn(),
    recordExpiration: vi.fn(),
    close: vi.fn(),
  };
}

type LoadOptions = {
  enabled?: boolean;
  session?: { sessionId: string; conversationId: string } | null;
  signingError?: boolean;
  subscribeResult?: { ok: true } | { ok: false; retryAfterSeconds: number };
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const subscription = createSubscription(options.session?.conversationId ?? "unused");
  const subscribe = vi
    .fn()
    .mockReturnValue(
      options.subscribeResult?.ok === false
        ? {
            ok: false,
            reason: "connection_limit",
            retryAfterSeconds: options.subscribeResult.retryAfterSeconds,
          }
        : { ok: true, subscription }
    );
  const hub = { subscribe, publish: vi.fn(), metrics: vi.fn(), size: vi.fn() };

  const resolveSession = vi
    .fn()
    .mockResolvedValue(options.session === undefined ? null : options.session);
  const parseKeys = options.signingError
    ? vi.fn(() => {
        throw new Error("CHAT_SESSION_SECRET is required");
      })
    : vi.fn(() => ({ active: "a".repeat(32), all: ["a".repeat(32)] }));

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/visitor-session", () => ({
    CHAT_VISITOR_SESSION_COOKIE_NAME: "chat_visitor_session",
    createVisitorSessionStore: () => ({}),
    parseVisitorSessionSigningKeys: parseKeys,
    resolveVisitorSession: resolveSession,
  }));
  vi.doMock("@/lib/chat/realtime", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/realtime")>();
    return { ...actual, getChatSignalHub: () => hub };
  });

  const route = await import("./route");
  return { GET: route.GET, hub, subscribe, subscription };
}

const VALID_ORIGIN = "https://mascercaap.com";

function getRequest(input: {
  origin?: string | null;
  cookie?: string | null;
  signal?: AbortSignal;
} = {}): Request {
  const headers: Record<string, string> = {};
  const origin = input.origin === undefined ? VALID_ORIGIN : input.origin;
  if (origin !== null) headers.origin = origin;
  const cookie =
    input.cookie === undefined ? "chat_visitor_session=v1.opaque-secret.sig" : input.cookie;
  if (cookie !== null) headers.cookie = cookie;
  return new Request("http://localhost/api/chat/visitor/stream", {
    headers,
    signal: input.signal,
  });
}

const SESSION = { sessionId: "session-1", conversationId: "conversation-1" };

describe("GET /api/chat/visitor/stream", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/visitor-session");
    vi.doUnmock("@/lib/chat/realtime");
  });

  it("returns the generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe } = await loadRoute({ enabled: false });

    const res = await GET(getRequest());
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin before any session or stream work", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe } = await loadRoute({ session: SESSION });

    const res = await GET(getRequest({ origin: "https://evil.test" }));
    expect(res.status).toBe(403);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated visitor with a generic 401", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe } = await loadRoute({ session: null });

    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("returns 503 on a session configuration error without leaking values", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET, subscribe } = await loadRoute({ signingError: true });

    const res = await GET(getRequest());
    expect(res.status).toBe(503);
    expect(subscribe).not.toHaveBeenCalled();
    for (const call of spy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("CHAT_SESSION_SECRET");
    }
  });

  it("returns a bounded 429 when a stream cap is exhausted", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET } = await loadRoute({
      session: SESSION,
      subscribeResult: { ok: false, retryAfterSeconds: 7 },
    });

    const res = await GET(getRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Retry-After")).toBe("7");
  });

  it("opens an opaque, no-buffering SSE stream scoped to the session conversation", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const controller = new AbortController();
    const { GET, subscribe, subscription } = await loadRoute({ session: SESSION });

    const res = await GET(getRequest({ signal: controller.signal }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    expect(subscribe).toHaveBeenCalledTimes(1);
    const input = subscribe.mock.calls[0][0] as {
      scope: string;
      keys: Array<{ key: string; max: number }>;
    };
    expect(input.scope).toBe("conversation-1");
    expect(input.keys).toHaveLength(2);
    expect(input.keys[0].key).toMatch(/^[0-9a-f]{64}$/);
    expect(input.keys[0].max).toBe(3);
    expect(input.keys[1].max).toBe(20);
    expect(JSON.stringify(input.keys)).not.toContain("session-1");
    expect(JSON.stringify(input.keys)).not.toContain("conversation-1");
    // Client disconnect releases the subscription.
    controller.abort();
    expect(subscription.close).toHaveBeenCalled();
  });

  it("accepts an absent Origin for a same-origin browser stream", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const controller = new AbortController();
    const { GET } = await loadRoute({ session: SESSION });

    const res = await GET(getRequest({ origin: null, signal: controller.signal }));
    expect(res.status).toBe(200);
    controller.abort();
  });
});
