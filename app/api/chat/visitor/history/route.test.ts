import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { decodeChatCursor, encodeChatCursor } from "@/lib/chat/validation";

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

function message(id: string, createdAt: Date, body = "Hola") {
  return {
    id,
    conversationId: "conversation-1",
    senderType: "visitor" as const,
    senderName: "Ana",
    body,
    clientMessageId: null,
    createdAt,
  };
}

type LoadOptions = {
  enabled?: boolean;
  store?: MockStore;
  session?: { sessionId: string; conversationId: string } | null;
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store = options.store ?? createStore();
  const resolveSession = vi.fn().mockResolvedValue(options.session ?? null);

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/conversations", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/conversations")>();
    return { ...actual, createVisitorConversationStore: () => store };
  });
  vi.doMock("@/lib/chat/visitor-session", () => ({
    CHAT_VISITOR_SESSION_COOKIE_NAME: "chat_visitor_session",
    createVisitorSessionStore: () => ({}),
    parseVisitorSessionSigningKeys: () => ({ active: "a".repeat(32), all: ["a".repeat(32)] }),
    resolveVisitorSession: resolveSession,
  }));

  const route = await import("./route");
  return { GET: route.GET, store, resolveSession };
}

const VALID_ORIGIN = "https://mascercaap.com";

function request(query = "", origin: string | null = VALID_ORIGIN, cookie = true): Request {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = "chat_visitor_session=v1.x.y";
  return new Request(`http://localhost/api/chat/visitor/history${query}`, { headers });
}

const SESSION = { sessionId: "session-1", conversationId: "conversation-1" };

describe("GET /api/chat/visitor/history", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/conversations");
    vi.doUnmock("@/lib/chat/visitor-session");
  });

  it("returns a generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ enabled: false });

    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(store.listMessages).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ session: SESSION });

    const res = await GET(request("", "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.listMessages).not.toHaveBeenCalled();
  });

  it("returns a generic 401 for absent, foreign or expired sessions", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ session: null });

    const res = await GET(request());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    expect(store.listMessages).not.toHaveBeenCalled();
  });

  it("returns the current conversation history newest-first without exposing its id", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    const newest = new Date("2026-10-09T12:05:00.000Z");
    const older = new Date("2026-10-09T12:00:00.000Z");
    store.listMessages.mockResolvedValueOnce([message("m2", newest), message("m1", older)]);
    const { GET } = await loadRoute({ store, session: SESSION });

    const res = await GET(request());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { messages: Array<Record<string, unknown>>; nextCursor: string | null };
    };
    expect(body.data.messages.map((m) => m.id)).toEqual(["m2", "m1"]);
    expect(body.data.messages[0]).toEqual({
      id: "m2",
      senderType: "visitor",
      body: "Hola",
      createdAt: newest.toISOString(),
    });
    expect(body.data.nextCursor).toBeNull();
    expect(JSON.stringify(body)).not.toContain("conversation-1");
    expect(store.listMessages).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      cursor: null,
      limit: 50,
    });
  });

  it("issues a composite next cursor when the page is full", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    const newest = new Date("2026-10-09T12:05:00.000Z");
    const older = new Date("2026-10-09T12:00:00.000Z");
    store.listMessages.mockResolvedValueOnce([message("m2", newest), message("m1", older)]);
    const { GET } = await loadRoute({ store, session: SESSION });

    const res = await GET(request("?limit=2"));
    const body = (await res.json()) as { data: { nextCursor: string | null } };
    expect(body.data.nextCursor).not.toBeNull();
    expect(decodeChatCursor(body.data.nextCursor)).toEqual({
      createdAt: older.toISOString(),
      id: "m1",
    });
  });

  it("passes a decoded cursor and a bounded limit to the store", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    const cursor = encodeChatCursor({ createdAt: "2026-10-09T11:00:00.000Z", id: "m0" });
    const { GET } = await loadRoute({ store, session: SESSION });

    await GET(request(`?cursor=${encodeURIComponent(cursor)}&limit=200`));
    expect(store.listMessages).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      cursor: { createdAt: "2026-10-09T11:00:00.000Z", id: "m0" },
      limit: 100,
    });
  });

  it("rejects a malformed cursor with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ store: createStore(), session: SESSION });

    const res = await GET(request("?cursor=not-a-cursor"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ success: false, error: "chat_request_failed" });
    expect(store.listMessages).not.toHaveBeenCalled();
  });

  it("GET accepts an absent Origin (same-origin browser read) with an active session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.listMessages.mockResolvedValueOnce([]);
    const { GET } = await loadRoute({ store, session: SESSION });

    // request("", null) sends no Origin header, as a same-origin browser GET does.
    const res = await GET(request("", null));
    expect(res.status).toBe(200);
    expect(store.listMessages).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      cursor: null,
      limit: 50,
    });
  });

  it("GET still rejects an explicitly present foreign Origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    const { GET } = await loadRoute({ store, session: SESSION });

    const res = await GET(request("", "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.listMessages).not.toHaveBeenCalled();
  });
});
