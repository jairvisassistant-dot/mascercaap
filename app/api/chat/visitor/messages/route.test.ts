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

const CONVERSATION = {
  id: "conversation-1",
  status: "open",
  visitorName: "Ana",
  createdAt: new Date("2026-10-09T12:00:00.000Z"),
  updatedAt: new Date("2026-10-09T12:00:00.000Z"),
  lastMessageAt: null,
};

type MockMetricsStore = {
  insertEvent: ReturnType<typeof vi.fn>;
};

function createMetricsStore(): MockMetricsStore {
  return { insertEvent: vi.fn().mockResolvedValue(undefined) };
}

type BotDecision = {
  intent: string;
  confidence: number;
  handoff: boolean;
  answer: string | null;
};

type LoadOptions = {
  enabled?: boolean;
  bot?: boolean;
  store?: MockStore;
  metricsStore?: MockMetricsStore;
  botDecision?: BotDecision;
  session?: { sessionId: string; conversationId: string } | null;
  rateAllowed?: boolean;
  retryAfter?: number;
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store = options.store ?? createStore();
  const metricsStore = options.metricsStore ?? createMetricsStore();
  const enforce = vi.fn().mockResolvedValue({
    allowed: options.rateAllowed ?? true,
    retryAfterSeconds: options.retryAfter ?? 0,
  });
  const resolveSession = vi.fn().mockResolvedValue(options.session ?? null);
  const decideBotHandoff = vi.fn(
    (): BotDecision =>
      options.botDecision ?? { intent: "fuera_de_alcance", confidence: 0, handoff: true, answer: null }
  );

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true, bot: options.bot ?? false },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/conversations", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/conversations")>();
    return {
      ...actual,
      createVisitorConversationStore: () => store,
      createChatMetricEventStore: () => metricsStore,
    };
  });
  vi.doMock("@/lib/chat/rate-limit", () => ({
    enforceChatRateLimit: enforce,
    createChatRateLimitStore: () => ({ increment: vi.fn() }),
  }));
  vi.doMock("@/lib/chat/visitor-session", () => ({
    CHAT_VISITOR_SESSION_COOKIE_NAME: "chat_visitor_session",
    createVisitorSessionStore: () => ({}),
    parseVisitorSessionSigningKeys: () => ({ active: "a".repeat(32), all: ["a".repeat(32)] }),
    resolveVisitorSession: resolveSession,
  }));
  vi.doMock("@/lib/chat/bot", () => ({
    decideBotHandoff,
    CHAT_BOT_CONFIDENCE_THRESHOLD: 0.7,
  }));

  const route = await import("./route");
  return { POST: route.POST, store, metricsStore, enforce, resolveSession, decideBotHandoff };
}

const VALID_ORIGIN = "https://mascercaap.com";

function postRequest(body: unknown, origin: string | null = VALID_ORIGIN, cookie = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = "chat_visitor_session=v1.x.y";
  return new Request("http://localhost/api/chat/visitor/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { body: "Hola", clientMessageId: "client-1" };

describe("POST /api/chat/visitor/messages", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/conversations");
    vi.doUnmock("@/lib/chat/rate-limit");
    vi.doUnmock("@/lib/chat/visitor-session");
    vi.doUnmock("@/lib/chat/bot");
  });

  it("returns a generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ enabled: false });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(404);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ session: { sessionId: "s", conversationId: "c" } });

    const res = await POST(postRequest(VALID_BODY, "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("returns a generic 401 for absent, forged or expired sessions", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, enforce, store } = await loadRoute({ session: null });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    expect(enforce).not.toHaveBeenCalled();
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the message limit is exhausted", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, enforce, store } = await loadRoute({
      session: { sessionId: "session-1", conversationId: "conversation-1" },
      rateAllowed: false,
      retryAfter: 60,
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(enforce).toHaveBeenCalledWith(
      expect.objectContaining({ action: "message_send", trustedKey: "conversation-1" })
    );
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    for (const payload of [
      { body: "", clientMessageId: "client-1" },
      { body: "Hola" },
      { body: "Hola", clientMessageId: "client-1", senderType: "operator" },
    ]) {
      const res = await POST(postRequest(payload));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    }
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("returns a generic 404 when the conversation was purged", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(404);
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("persists a new message with the server-derived sender name", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    const { POST } = await loadRoute({
      store,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { message: Record<string, unknown>; duplicated: boolean };
    };
    expect(body.data.duplicated).toBe(false);
    expect(body.data.message).toEqual({
      id: expect.any(String),
      senderType: "visitor",
      body: "Hola",
      createdAt: expect.any(String),
    });
    expect(store.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        senderType: "visitor",
        senderName: "Ana",
        body: "Hola",
        clientMessageId: "client-1",
      })
    );
  });

  it("returns the stored message for a repeated client_message_id without inserting", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.findMessageByClientId.mockResolvedValueOnce({
      id: "message-1",
      conversationId: "conversation-1",
      senderType: "visitor",
      senderName: "Ana",
      body: "Hola",
      clientMessageId: "client-1",
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
    });
    const { POST } = await loadRoute({
      store,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { duplicated: boolean; message: { id: string } } };
    expect(body.data.duplicated).toBe(true);
    expect(body.data.message.id).toBe("message-1");
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("reconciles a concurrent duplicate insert without duplicating", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.findMessageByClientId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "winner",
        conversationId: "conversation-1",
        senderType: "visitor",
        senderName: "Ana",
        body: "Hola",
        clientMessageId: "client-1",
        createdAt: new Date("2026-10-09T12:00:00.000Z"),
      });
    store.insertMessage.mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });
    const { POST } = await loadRoute({
      store,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { duplicated: boolean; message: { id: string } } };
    expect(body.data.duplicated).toBe(true);
    expect(body.data.message.id).toBe("winner");
  });

  it("runs zero bot behavior while CHAT_BOT_ENABLED is off (D6 gate)", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    const { POST, decideBotHandoff, metricsStore } = await loadRoute({
      store,
      bot: false,
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(decideBotHandoff).not.toHaveBeenCalled();
    expect(metricsStore.insertEvent).not.toHaveBeenCalled();
    expect(store.insertMessage).toHaveBeenCalledTimes(1);
    expect(store.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderType: "visitor" })
    );
  });

  it("persists an approved bot reply with server-derived sender on the same write path", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    const answer =
      "Nuestros precios varían según la presentación (120 g, 300 g y 1000 g) y el sabor.";
    const { POST } = await loadRoute({
      store,
      bot: true,
      botDecision: { intent: "precios", confidence: 1, handoff: false, answer },
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest({ body: "¿Cuánto cuesta?", clientMessageId: "client-1" }));
    expect(res.status).toBe(200);
    expect(store.insertMessage).toHaveBeenCalledTimes(2);
    expect(store.insertMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ senderType: "visitor", body: "¿Cuánto cuesta?" })
    );
    expect(store.insertMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        conversationId: "conversation-1",
        senderType: "bot",
        senderName: "Asistente",
        body: answer,
        clientMessageId: expect.any(String),
      })
    );
    // Deterministic bot idempotency key: derived from the visitor message id.
    const visitorCall = store.insertMessage.mock.calls[0][0] as { clientMessageId: string };
    const botCall = store.insertMessage.mock.calls[1][0] as { clientMessageId: string };
    expect(botCall.clientMessageId).not.toBe(visitorCall.clientMessageId);
    expect(botCall.clientMessageId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hands off without a bot message when the classifier defers to the coordinator", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    const { POST, decideBotHandoff, metricsStore } = await loadRoute({
      store,
      bot: true,
      botDecision: { intent: "humano", confidence: 0.75, handoff: true, answer: null },
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest({ body: "hablar con un humano", clientMessageId: "client-1" }));
    expect(res.status).toBe(200);
    expect(decideBotHandoff).toHaveBeenCalledWith("hablar con un humano");
    expect(store.insertMessage).toHaveBeenCalledTimes(1);
    expect(store.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderType: "visitor" })
    );
    // Handoff visibility comes from the existing operator notify/SSE path; the
    // intent code is still recorded for aggregates.
    expect(metricsStore.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "message_persisted",
        intent: "humano",
        senderType: "visitor",
      })
    );
  });

  it("records intent-only metrics metadata without any customer content", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    const { POST, metricsStore } = await loadRoute({
      store,
      bot: true,
      botDecision: { intent: "precios", confidence: 1, handoff: false, answer: "Texto aprobado." },
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(
      postRequest({ body: "Dime el precio secreto de todo", clientMessageId: "client-1" })
    );
    expect(res.status).toBe(200);
    expect(metricsStore.insertEvent).toHaveBeenCalledTimes(1);
    const event = metricsStore.insertEvent.mock.calls[0][0] as Record<string, unknown>;
    expect(event.intent).toBe("precios");
    expect(event.senderType).toBe("bot");
    const serialized = JSON.stringify(metricsStore.insertEvent.mock.calls);
    expect(serialized).not.toContain("precio secreto");
    expect(serialized).not.toContain("client-1");
  });

  it("never fails the visitor send when the bot reply cannot be persisted", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.insertMessage
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("db down"));
    const { POST } = await loadRoute({
      store,
      bot: true,
      botDecision: { intent: "precios", confidence: 1, handoff: false, answer: "Texto aprobado." },
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { message: { senderType: string } } };
    expect(body.data.message.senderType).toBe("visitor");
  });

  it("skips bot work and metrics for a duplicated retry", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.findMessageByClientId.mockResolvedValue({
      id: "message-1",
      conversationId: "conversation-1",
      senderType: "visitor",
      senderName: "Ana",
      body: "Hola",
      clientMessageId: "client-1",
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
    });
    const { POST, decideBotHandoff, metricsStore } = await loadRoute({
      store,
      bot: true,
      botDecision: { intent: "precios", confidence: 1, handoff: false, answer: "Texto aprobado." },
      session: { sessionId: "session-1", conversationId: "conversation-1" },
    });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(decideBotHandoff).not.toHaveBeenCalled();
    expect(metricsStore.insertEvent).not.toHaveBeenCalled();
    expect(store.insertMessage).not.toHaveBeenCalled();
  });
});
