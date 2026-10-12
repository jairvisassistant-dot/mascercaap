import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";
import { encodeConversationHandle } from "@/lib/chat/operator-conversations";

const OPERATOR_ID = "coordinator@example.com";
const HANDLE = encodeConversationHandle("conversation-1");

type MockStore = {
  listConversations: ReturnType<typeof vi.fn>;
  findConversationById: ReturnType<typeof vi.fn>;
  listMessages: ReturnType<typeof vi.fn>;
  findMessageByClientId: ReturnType<typeof vi.fn>;
  insertMessage: ReturnType<typeof vi.fn>;
  markConversationRead: ReturnType<typeof vi.fn>;
  closeConversation: ReturnType<typeof vi.fn>;
};

function createStore(): MockStore {
  return {
    listConversations: vi.fn().mockResolvedValue([]),
    findConversationById: vi.fn().mockResolvedValue(null),
    listMessages: vi.fn().mockResolvedValue([]),
    findMessageByClientId: vi.fn().mockResolvedValue(null),
    insertMessage: vi.fn().mockResolvedValue(undefined),
    markConversationRead: vi.fn().mockResolvedValue(undefined),
    closeConversation: vi.fn().mockResolvedValue(null),
  };
}

type LoadOptions = {
  enabled?: boolean;
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
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/operator-auth", () => ({
    requireOperatorAuth: auth,
    getOperatorIdentity: () => ({ operatorId: OPERATOR_ID, senderType: "operator" }),
    OPERATOR_SENDER_TYPE: "operator",
  }));
  vi.doMock("@/lib/chat/operator-conversations", async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("@/lib/chat/operator-conversations")>();
    return { ...actual, createOperatorConversationStore: () => store };
  });

  const route = await import("./route");
  return { GET: route.GET, POST: route.POST, store, auth };
}

const VALID_ORIGIN = "https://mascercaap.com";

const CONVERSATION = {
  id: "conversation-1",
  status: "open",
  visitorName: "Ana",
  visitorEmail: "ana@example.com",
  visitorPhone: null,
  assignedOperatorId: null,
  closeResult: null,
  closeNote: null,
  createdAt: new Date("2026-10-09T12:00:00.000Z"),
  updatedAt: new Date("2026-10-09T12:00:00.000Z"),
  lastMessageAt: null,
  closedAt: null,
  unreadCount: 0,
};

function getRequest(query = "", origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return new Request(`http://localhost/api/chat/operator/messages${query}`, { headers });
}

function postRequest(body: unknown, origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request("http://localhost/api/chat/operator/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("GET /api/chat/operator/messages", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/operator-auth");
    vi.doUnmock("@/lib/chat/operator-conversations");
  });

  it("returns a generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ enabled: false });
    const res = await GET(getRequest(`?conversationHandle=${HANDLE}`));
    expect(res.status).toBe(404);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute();
    const res = await GET(getRequest(`?conversationHandle=${HANDLE}`, "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with the boundary status", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ authStatus: 403 });
    const res = await GET(getRequest(`?conversationHandle=${HANDLE}`));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("rejects a malformed conversation handle with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute();
    const res = await GET(getRequest("?conversationHandle=@@bad@@"));
    expect(res.status).toBe(400);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("returns a generic 404 for an unknown conversation", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET } = await loadRoute();
    const res = await GET(getRequest(`?conversationHandle=${HANDLE}`));
    expect(res.status).toBe(404);
  });

  it("returns the support thread with a composite next cursor", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.listMessages.mockResolvedValueOnce([
      {
        id: "m1",
        conversationId: "conversation-1",
        senderType: "visitor",
        senderName: "Ana",
        body: "hola",
        clientMessageId: null,
        createdAt: new Date("2026-10-09T12:00:00.000Z"),
      },
    ]);
    const { GET } = await loadRoute({ store });

    const res = await GET(getRequest(`?conversationHandle=${HANDLE}&limit=1`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { conversation: Record<string, unknown>; messages: unknown[]; nextCursor: string | null };
    };
    expect(body.data.conversation).not.toHaveProperty("id");
    expect(body.data.conversation.visitorEmail).toBe("ana@example.com");
    expect(body.data.messages).toHaveLength(1);
    expect(body.data.nextCursor).toEqual(expect.any(String));
  });

  it("returns a generic 503 on a database failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockRejectedValueOnce(new Error("boom"));
    const { GET } = await loadRoute({ store });
    const res = await GET(getRequest(`?conversationHandle=${HANDLE}`));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/chat/operator/messages", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/operator-auth");
    vi.doUnmock("@/lib/chat/operator-conversations");
  });

  const VALID_BODY = { conversationHandle: HANDLE, body: "Hola", clientMessageId: "reply-123456" };

  it("rejects an unauthenticated reply before touching data", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ authStatus: 401 });
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(store.findConversationById).not.toHaveBeenCalled();
  });

  it("rejects a spoofed sender identity or out-of-bounds body", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    for (const payload of [
      { ...VALID_BODY, senderType: "bot" },
      { ...VALID_BODY, operatorId: "attacker" },
      { ...VALID_BODY, body: "" },
      { ...VALID_BODY, body: "x".repeat(1001) },
      { body: "hi", clientMessageId: "reply-123456" },
    ]) {
      const res = await POST(postRequest(payload));
      expect(res.status).toBe(400);
    }
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("returns a generic 404 when the conversation is gone", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(404);
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("refuses to reply to a closed conversation", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce({ ...CONVERSATION, status: "closed" });
    const { POST } = await loadRoute({ store });
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(409);
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("persists an operator reply with the server-derived sender", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    const { POST } = await loadRoute({ store });

    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { message: Record<string, unknown>; duplicated: boolean; status: string };
    };
    expect(body.data.duplicated).toBe(false);
    expect(body.data.status).toBe("assigned");
    expect(store.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        senderType: "operator",
        senderName: OPERATOR_ID,
        body: "Hola",
        clientMessageId: "reply-123456",
        operatorId: OPERATOR_ID,
      })
    );
  });

  it("returns the stored reply for a repeated idempotency key", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.findMessageByClientId.mockResolvedValueOnce({
      id: "m1",
      conversationId: "conversation-1",
      senderType: "operator",
      senderName: OPERATOR_ID,
      body: "Hola",
      clientMessageId: "reply-123456",
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
    });
    const { POST } = await loadRoute({ store });

    const res = await POST(postRequest(VALID_BODY));
    const body = (await res.json()) as { data: { duplicated: boolean } };
    expect(body.data.duplicated).toBe(true);
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("returns a generic 503 on a database failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.findConversationById.mockResolvedValueOnce(CONVERSATION);
    store.findMessageByClientId.mockRejectedValueOnce(new Error("boom"));
    const { POST } = await loadRoute({ store });
    const res = await POST(postRequest(VALID_BODY));
    expect(res.status).toBe(503);
  });
});
