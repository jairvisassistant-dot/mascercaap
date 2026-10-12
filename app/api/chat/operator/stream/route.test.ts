import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";

const OPERATOR_ID = "coordinator@example.com";

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
  authStatus?: number | null;
  identity?: boolean;
  subscribeResult?: { ok: true } | { ok: false; retryAfterSeconds: number };
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const subscription = createSubscription("operator-chat");
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

  const auth = vi
    .fn()
    .mockResolvedValue(
      options.authStatus == null
        ? null
        : NextResponse.json({ error: "boundary" }, { status: options.authStatus })
    );
  const identity =
    options.identity === false
      ? null
      : { operatorId: OPERATOR_ID, senderType: "operator" as const };

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/operator-auth", () => ({
    requireOperatorAuth: auth,
    getOperatorIdentity: () => identity,
  }));
  vi.doMock("@/lib/chat/realtime", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/realtime")>();
    return { ...actual, getChatSignalHub: () => hub };
  });

  const route = await import("./route");
  return { GET: route.GET, hub, subscribe, subscription, auth };
}

const VALID_ORIGIN = "https://mascercaap.com";

function getRequest(input: { origin?: string | null; signal?: AbortSignal } = {}): Request {
  const headers: Record<string, string> = {};
  const origin = input.origin === undefined ? VALID_ORIGIN : input.origin;
  if (origin !== null) headers.origin = origin;
  return new Request("http://localhost/api/chat/operator/stream", {
    headers,
    signal: input.signal,
  });
}

describe("GET /api/chat/operator/stream", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/operator-auth");
    vi.doUnmock("@/lib/chat/realtime");
  });

  it("returns the generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe } = await loadRoute({ enabled: false });

    const res = await GET(getRequest());
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin before auth", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe, auth } = await loadRoute();

    const res = await GET(getRequest({ origin: "https://evil.test" }));
    expect(res.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("preserves the admin boundary status with a generic, no-store envelope", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe } = await loadRoute({ authStatus: 401 });

    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("returns 503 when the server operator identity is unavailable", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, subscribe } = await loadRoute({ identity: false });

    const res = await GET(getRequest());
    expect(res.status).toBe(503);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("returns a bounded 429 when the stream cap is exhausted", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET } = await loadRoute({ subscribeResult: { ok: false, retryAfterSeconds: 3 } });

    const res = await GET(getRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3");
  });

  it("opens an opaque coordinator stream on the shared operator channel", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const controller = new AbortController();
    const { GET, subscribe, subscription } = await loadRoute();

    const res = await GET(getRequest({ signal: controller.signal }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");

    const input = subscribe.mock.calls[0][0] as {
      scope: string;
      keys: Array<{ key: string; max: number }>;
    };
    expect(input.scope).toBe("operator-chat");
    expect(input.keys).toHaveLength(2);
    expect(input.keys[0].key).toMatch(/^[0-9a-f]{64}$/);
    expect(input.keys[0].max).toBe(3);
    expect(input.keys[1].max).toBe(20);
    expect(JSON.stringify(input.keys)).not.toContain(OPERATOR_ID);

    controller.abort();
    expect(subscription.close).toHaveBeenCalled();
  });

  it("accepts an absent Origin for a same-origin browser stream", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const controller = new AbortController();
    const { GET } = await loadRoute();

    const res = await GET(getRequest({ origin: null, signal: controller.signal }));
    expect(res.status).toBe(200);
    controller.abort();
  });
});
