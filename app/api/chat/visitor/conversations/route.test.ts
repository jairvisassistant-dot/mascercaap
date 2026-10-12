import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

type MockStore = {
  createConversationWithSession: ReturnType<typeof vi.fn>;
  findConversationById: ReturnType<typeof vi.fn>;
  listMessages: ReturnType<typeof vi.fn>;
  findMessageByClientId: ReturnType<typeof vi.fn>;
  insertMessage: ReturnType<typeof vi.fn>;
};

function createStore(): MockStore {
  return {
    createConversationWithSession: vi.fn().mockResolvedValue(undefined),
    findConversationById: vi.fn().mockResolvedValue(null),
    listMessages: vi.fn().mockResolvedValue([]),
    findMessageByClientId: vi.fn().mockResolvedValue(null),
    insertMessage: vi.fn().mockResolvedValue(undefined),
  };
}

type LoadOptions = {
  enabled?: boolean;
  store?: MockStore;
  session?: { sessionId: string; conversationId: string } | null;
  rateAllowed?: boolean;
  retryAfter?: number;
  signingError?: boolean;
  consentError?: boolean;
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store = options.store ?? createStore();
  const enforce = vi.fn().mockResolvedValue({
    allowed: options.rateAllowed ?? true,
    retryAfterSeconds: options.retryAfter ?? 0,
  });
  const resolveSession = vi.fn().mockResolvedValue(options.session ?? null);
  const captureConsent = options.consentError
    ? vi.fn().mockRejectedValue(new Error("consent insert failed"))
    : vi.fn().mockResolvedValue(undefined);
  const parseKeys = options.signingError
    ? vi.fn(() => {
        throw new Error("CHAT_SESSION_SECRET is required");
      })
    : vi.fn(() => ({ active: "a".repeat(32), all: ["a".repeat(32)] }));

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/conversations", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/conversations")>();
    return { ...actual, createVisitorConversationStore: () => store };
  });
  vi.doMock("@/lib/chat/rate-limit", () => ({
    enforceChatRateLimit: enforce,
    createChatRateLimitStore: () => ({ increment: vi.fn() }),
  }));
  vi.doMock("@/lib/chat/consent", () => ({
    captureChatEntryConsent: captureConsent,
    createContactConsentStore: () => ({ capture: vi.fn(), revoke: vi.fn() }),
  }));
  vi.doMock("@/lib/chat/visitor-session", () => ({
    CHAT_VISITOR_SESSION_COOKIE_NAME: "chat_visitor_session",
    createVisitorSessionStore: () => ({}),
    parseVisitorSessionSigningKeys: parseKeys,
    createVisitorSessionMaterial: (input: { now: Date }) => ({
      id: "session-1",
      secret: "opaque-secret",
      sessionHash: "hash",
      createdAt: input.now,
      lastSeenAt: input.now,
      expiresAt: input.now,
    }),
    toNewVisitorSession: (material: Record<string, unknown>, conversationId: string) => ({
      id: material.id,
      conversationId,
      sessionHash: material.sessionHash,
      createdAt: material.createdAt,
      lastSeenAt: material.lastSeenAt,
      expiresAt: material.expiresAt,
    }),
    visitorSessionCookieOptions: (input: { ttlSeconds: number; secure: boolean }) => ({
      name: "chat_visitor_session",
      httpOnly: true,
      secure: input.secure,
      sameSite: "lax",
      path: "/",
      maxAge: input.ttlSeconds,
    }),
    resolveVisitorSession: resolveSession,
    resolveVisitorSessionTtl: () => 1000,
    buildVisitorSessionCookieValue: () => "v1.opaque-secret.sig",
  }));

  const route = await import("./route");
  return {
    POST: route.POST,
    GET: route.GET,
    store,
    enforce,
    resolveSession,
    parseKeys,
    captureConsent,
  };
}

const VALID_ORIGIN = "https://mascercaap.com";
const ALLOWED = { ALLOWED_ORIGINS: VALID_ORIGIN };

function postRequest(body: unknown, origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request("http://localhost/api/chat/visitor/conversations", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function getRequest(origin: string | null = VALID_ORIGIN, cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  return new Request("http://localhost/api/chat/visitor/conversations", { headers });
}

const VALID_BODY = {
  name: "Ana",
  email: "ana@example.com",
  phone: "+57 300 000 0000",
  marketingConsent: false,
};

describe("POST/GET /api/chat/visitor/conversations", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/conversations");
    vi.doUnmock("@/lib/chat/rate-limit");
    vi.doUnmock("@/lib/chat/consent");
    vi.doUnmock("@/lib/chat/visitor-session");
  });

  it("returns a generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, store } = await loadRoute({ enabled: false });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    expect(store.createConversationWithSession).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, store } = await loadRoute();

    const res = await POST(postRequest(VALID_BODY, "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.createConversationWithSession).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the open limit is exhausted", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, enforce, store } = await loadRoute({ rateAllowed: false, retryAfter: 60 });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(enforce).toHaveBeenCalledWith(
      expect.objectContaining({ action: "conversation_open" })
    );
    expect(store.createConversationWithSession).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload with a generic 400 and no field detail", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, store } = await loadRoute();

    const res = await POST(postRequest({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    expect(store.createConversationWithSession).not.toHaveBeenCalled();
  });

  it("rejects an over-sized body with a generic 413", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST } = await loadRoute();

    const res = await POST(postRequest({ ...VALID_BODY, name: "A".repeat(20000) }));
    expect(res.status).toBe(413);
  });

  it("creates the conversation/session atomically and sets a hardened cookie", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    vi.stubEnv("NODE_ENV", "production");
    const { POST, store } = await loadRoute();

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success: boolean; data: { conversation: Record<string, unknown> } };
    expect(body.success).toBe(true);
    expect(body.data.conversation).toEqual({
      status: "open",
      createdAt: expect.any(String),
      lastMessageAt: null,
    });
    // The internal conversation id must never appear in the payload.
    expect(JSON.stringify(body)).not.toContain("conversationId");
    expect(body.data.conversation).not.toHaveProperty("id");

    expect(store.createConversationWithSession).toHaveBeenCalledWith(
      expect.objectContaining({
        visitorName: "Ana",
        visitorEmail: "ana@example.com",
        visitorPhone: "+57 300 000 0000",
      })
    );

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("chat_visitor_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
  });

  it("returns a generic 503 when the signing secret is unavailable", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, store } = await loadRoute({ signingError: true });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(503);
    expect(store.createConversationWithSession).not.toHaveBeenCalled();
  });

  it("returns a generic 503 on a database failure without logging PII", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createStore();
    store.createConversationWithSession.mockRejectedValueOnce(new Error("duplicate key"));
    const { POST } = await loadRoute({ store });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(503);

    for (const call of spy.mock.calls) {
      const rendered = JSON.stringify(call);
      expect(rendered).not.toContain("ana@example.com");
      expect(rendered).not.toContain("Ana");
    }
    expect(spy).toHaveBeenCalled();
  });

  it("GET returns a generic 401 without an active session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { GET, store } = await loadRoute({ session: null });

    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("GET reads only the current authorized conversation", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const now = new Date("2026-10-09T12:00:00.000Z");
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce({
      id: "conversation-1",
      status: "open",
      visitorName: "Ana",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
    });
    const { GET } = await loadRoute({
      store,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await GET(getRequest(VALID_ORIGIN, "chat_visitor_session=v1.x.y"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { conversation: Record<string, unknown> } };
    expect(body.data.conversation.status).toBe("open");
    expect(JSON.stringify(body)).not.toContain("conversation-1");
    expect(store.findConversationById).toHaveBeenCalledWith("conversation-1");
  });

  it("GET returns a generic 404 when the conversation no longer exists", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { GET } = await loadRoute({
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await GET(getRequest(VALID_ORIGIN, "chat_visitor_session=v1.x.y"));
    expect(res.status).toBe(404);
  });

  it("GET accepts an absent Origin (same-origin browser read) with an active session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const now = new Date("2026-10-09T12:00:00.000Z");
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce({
      id: "conversation-1",
      status: "open",
      visitorName: "Ana",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
    });
    const { GET } = await loadRoute({
      store,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    // getRequest(origin = null) sends no Origin header, as a same-origin browser GET does.
    const res = await GET(getRequest(null, "chat_visitor_session=v1.x.y"));
    expect(res.status).toBe(200);
    expect(store.findConversationById).toHaveBeenCalledWith("conversation-1");
  });

  it("GET still rejects an explicitly present foreign Origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const store = createStore();
    const { GET } = await loadRoute({
      store,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await GET(getRequest("https://evil.test", "chat_visitor_session=v1.x.y"));
    expect(res.status).toBe(403);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("persists the marketing consent after commit when the visitor opts in", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, store, captureConsent } = await loadRoute();

    const res = await POST(postRequest({ ...VALID_BODY, marketingConsent: true }));
    expect(res.status).toBe(200);
    expect(store.createConversationWithSession).toHaveBeenCalledTimes(1);
    expect(captureConsent).toHaveBeenCalledTimes(1);
    expect(captureConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@example.com",
        phone: "+57 300 000 0000",
        now: expect.any(Date),
        store: expect.any(Object),
      })
    );
    // The consent decision never appears in the response payload.
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("marketingConsent");
    expect(text).not.toContain("consent");
  });

  it("captures only the email channel when the opted-in visitor sends no phone", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, captureConsent } = await loadRoute();

    const res = await POST(
      postRequest({ name: "Ana", email: "ana@example.com", marketingConsent: true })
    );
    expect(res.status).toBe(200);
    expect(captureConsent).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@example.com", phone: null })
    );
  });

  it("creates zero consent rows when the visitor does not opt in", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, store, captureConsent } = await loadRoute();

    const res = await POST(postRequest({ ...VALID_BODY, marketingConsent: false }));
    expect(res.status).toBe(200);
    expect(store.createConversationWithSession).toHaveBeenCalledTimes(1);
    expect(captureConsent).not.toHaveBeenCalled();
  });

  it("creates zero consent rows when the opt-in field is omitted (default no-consent)", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const { POST, captureConsent } = await loadRoute();
    const withoutConsent = {
      name: VALID_BODY.name,
      email: VALID_BODY.email,
      phone: VALID_BODY.phone,
    };

    const res = await POST(postRequest(withoutConsent));
    expect(res.status).toBe(200);
    expect(captureConsent).not.toHaveBeenCalled();
  });

  it("still creates the conversation when consent capture fails, without logging PII", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", ALLOWED.ALLOWED_ORIGINS);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST, store, captureConsent } = await loadRoute({ consentError: true });

    const res = await POST(postRequest({ ...VALID_BODY, marketingConsent: true }));
    expect(res.status).toBe(200);
    expect(store.createConversationWithSession).toHaveBeenCalledTimes(1);
    expect(captureConsent).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      JSON.stringify({ scope: "chat", event: "chat_consent_error" })
    );
    for (const call of spy.mock.calls) {
      const rendered = JSON.stringify(call);
      expect(rendered).not.toContain("ana@example.com");
      expect(rendered).not.toContain("+57 300 000 0000");
    }
  });
});
