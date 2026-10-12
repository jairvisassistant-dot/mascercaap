import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";

const OPERATOR_ID = "coordinator@example.com";

type MockStore = {
  upsert: ReturnType<typeof vi.fn>;
  deleteByOperatorEndpoint: ReturnType<typeof vi.fn>;
  deleteByEndpoint: ReturnType<typeof vi.fn>;
  listByOperator: ReturnType<typeof vi.fn>;
};

function createStore(): MockStore {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    deleteByOperatorEndpoint: vi.fn().mockResolvedValue(true),
    deleteByEndpoint: vi.fn().mockResolvedValue(false),
    listByOperator: vi.fn().mockResolvedValue([]),
  };
}

type LoadOptions = {
  enabled?: boolean;
  push?: boolean;
  store?: MockStore;
  authStatus?: number | null;
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store = options.store ?? createStore();
  const auth = vi
    .fn()
    .mockResolvedValue(
      options.authStatus == null
        ? null
        : NextResponse.json({ error: "boundary" }, { status: options.authStatus })
    );

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true, push: options.push ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/operator-auth", () => ({
    requireOperatorAuth: auth,
    getOperatorIdentity: () => ({ operatorId: OPERATOR_ID, senderType: "operator" }),
    OPERATOR_SENDER_TYPE: "operator",
  }));
  vi.doMock("@/lib/chat/push", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/push")>();
    return { ...actual, createPushSubscriptionStore: () => store };
  });

  const route = await import("./route");
  return { GET: route.GET, POST: route.POST, DELETE: route.DELETE, store, auth };
}

const VALID_ORIGIN = "https://mascercaap.com";

const VAPID_ENV = {
  CHAT_VAPID_PUBLIC_KEY: "BP-test-public-key",
  CHAT_VAPID_PRIVATE_KEY: "super-secret-private-key",
  CHAT_VAPID_SUBJECT: "mailto:ops@example.com",
};

const SUBSCRIPTION_BODY = {
  endpoint: "https://push.example.net/endpoint-secret",
  keys: {
    p256dh: "BCv-secret-p256dh-value",
    auth: "BT-secret-auth-value",
  },
};

function request(
  method: string,
  body: unknown,
  origin: string | null = VALID_ORIGIN
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request("http://localhost/api/chat/operator/push-subscriptions", {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("@/lib/chat/config");
  vi.doUnmock("@/lib/chat/db");
  vi.doUnmock("@/lib/chat/operator-auth");
  vi.doUnmock("@/lib/chat/push");
});

describe("GET /api/chat/operator/push-subscriptions", () => {
  it("returns 404 while chat or push is disabled", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ enabled: false });
    expect((await GET(request("GET", null))).status).toBe(404);

    const off = await loadRoute({ push: false });
    expect((await off.GET(request("GET", null))).status).toBe(404);
    expect(store.listByOperator).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated read with the boundary status", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ authStatus: 403 });
    const res = await GET(request("GET", null));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: CHAT_GENERIC_ERROR_CODE,
    });
    expect(store.listByOperator).not.toHaveBeenCalled();
  });

  it("returns only the public VAPID key, never the private key or key material", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    for (const [key, value] of Object.entries(VAPID_ENV)) vi.stubEnv(key, value);
    vi.stubEnv("ADMIN_EMAIL", OPERATOR_ID);
    const { GET } = await loadRoute();

    const res = await GET(request("GET", null));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      success: true,
      data: { publicKey: "BP-test-public-key" },
    });
    expect(text).not.toContain("super-secret-private-key");
    expect(text).not.toContain("p256dh");
    expect(text).not.toContain("auth");
  });

  it("reports an empty public key while VAPID is not configured", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET } = await loadRoute();
    const res = await GET(request("GET", null));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { publicKey: "" },
    });
  });
});

describe("POST /api/chat/operator/push-subscriptions", () => {
  it("rejects a foreign origin before touching data", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    const res = await POST(request("POST", SUBSCRIPTION_BODY, "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated subscription with the boundary status", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ authStatus: 401 });
    expect((await POST(request("POST", SUBSCRIPTION_BODY))).status).toBe(401);
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("rejects malformed subscription payloads with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    for (const [key, value] of Object.entries(VAPID_ENV)) vi.stubEnv(key, value);
    const { POST, store } = await loadRoute();
    for (const payload of [
      { ...SUBSCRIPTION_BODY, endpoint: "http://insecure.example.net/x" },
      { endpoint: SUBSCRIPTION_BODY.endpoint },
      { ...SUBSCRIPTION_BODY, keys: { p256dh: "" } },
      { ...SUBSCRIPTION_BODY, endpoint: "ftp://nope" },
      { ...SUBSCRIPTION_BODY, extra: "field" },
    ]) {
      const res = await POST(request("POST", payload));
      expect(res.status).toBe(400);
    }
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("fails closed with 503 while VAPID keys are unconfigured", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    expect((await POST(request("POST", SUBSCRIPTION_BODY))).status).toBe(503);
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it("stores the subscription for the server-derived operator and returns a generic body", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    for (const [key, value] of Object.entries(VAPID_ENV)) vi.stubEnv(key, value);
    const { POST, store } = await loadRoute();

    const res = await POST(request("POST", SUBSCRIPTION_BODY));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ success: true, data: {} });
    // Key material must never leave the server in a response body.
    expect(text).not.toContain("endpoint-secret");
    expect(text).not.toContain("p256dh");
    expect(text).not.toContain("secret-auth-value");

    expect(store.upsert).toHaveBeenCalledTimes(1);
    const input = store.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(input.operatorId).toBe(OPERATOR_ID);
    expect(input.endpoint).toBe(SUBSCRIPTION_BODY.endpoint);
    expect(input.p256dh).toBe(SUBSCRIPTION_BODY.keys.p256dh);
    expect(input.auth).toBe(SUBSCRIPTION_BODY.keys.auth);
    expect(input.id).toEqual(expect.any(String));
    expect(input.now).toBeInstanceOf(Date);
  });
});

describe("DELETE /api/chat/operator/push-subscriptions", () => {
  it("rejects a foreign origin and an unauthenticated request", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { DELETE, store } = await loadRoute();
    expect(
      (await DELETE(request("DELETE", { endpoint: SUBSCRIPTION_BODY.endpoint }, "https://evil.test")))
        .status
    ).toBe(403);

    const unauthorized = await loadRoute({ authStatus: 401 });
    expect(
      (await unauthorized.DELETE(
        request("DELETE", { endpoint: SUBSCRIPTION_BODY.endpoint })
      )).status
    ).toBe(401);
    expect(store.deleteByOperatorEndpoint).not.toHaveBeenCalled();
  });

  it("deletes scoped to the operator and answers identically for a missing endpoint", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    for (const [key, value] of Object.entries(VAPID_ENV)) vi.stubEnv(key, value);

    const existing = createStore();
    const routeExisting = await loadRoute({ store: existing });
    const resExisting = await routeExisting.DELETE(
      request("DELETE", { endpoint: SUBSCRIPTION_BODY.endpoint })
    );

    const missing = createStore();
    missing.deleteByOperatorEndpoint.mockResolvedValue(false);
    const routeMissing = await loadRoute({ store: missing });
    const resMissing = await routeMissing.DELETE(
      request("DELETE", { endpoint: SUBSCRIPTION_BODY.endpoint })
    );

    expect(resExisting.status).toBe(200);
    expect(resMissing.status).toBe(200);
    // Same body whether or not the endpoint existed: no existence oracle.
    await expect(resExisting.json()).resolves.toEqual(await resMissing.json());

    expect(existing.deleteByOperatorEndpoint).toHaveBeenCalledWith({
      operatorId: OPERATOR_ID,
      endpoint: SUBSCRIPTION_BODY.endpoint,
    });
    expect(missing.deleteByOperatorEndpoint).toHaveBeenCalledWith({
      operatorId: OPERATOR_ID,
      endpoint: SUBSCRIPTION_BODY.endpoint,
    });
  });

  it("rejects a missing or malformed endpoint with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { DELETE, store } = await loadRoute();
    for (const payload of [{}, { endpoint: "" }, { endpoint: 42 }]) {
      expect((await DELETE(request("DELETE", payload))).status).toBe(400);
    }
    expect(store.deleteByOperatorEndpoint).not.toHaveBeenCalled();
  });
});
