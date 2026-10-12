import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";

const OPERATOR_ID = "coordinator@example.com";

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
  identity?: boolean;
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
  const identity =
    options.identity === false ? null : { operatorId: OPERATOR_ID, senderType: "operator" as const };

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/chat/operator-auth", () => ({
    requireOperatorAuth: auth,
    getOperatorIdentity: () => identity,
    OPERATOR_SENDER_TYPE: "operator",
  }));
  vi.doMock("@/lib/chat/operator-conversations", async (importOriginal) => {
    const actual =
      await importOriginal<typeof import("@/lib/chat/operator-conversations")>();
    return { ...actual, createOperatorConversationStore: () => store };
  });

  const route = await import("./route");
  return { GET: route.GET, store, auth };
}

const VALID_ORIGIN = "https://mascercaap.com";

function getRequest(query = "", origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  return new Request(`http://localhost/api/chat/operator/conversations${query}`, { headers });
}

const LIST_ITEM = {
  id: "conversation-1",
  status: "open",
  visitorName: "Ana",
  assignedOperatorId: null,
  closeResult: null,
  createdAt: new Date("2026-10-09T12:00:00.000Z"),
  updatedAt: new Date("2026-10-09T12:00:00.000Z"),
  lastMessageAt: new Date("2026-10-09T12:05:00.000Z"),
  closedAt: null,
  unreadCount: 2,
};

describe("GET /api/chat/operator/conversations", () => {
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

    const res = await GET(getRequest());
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(store.listConversations).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403 before auth", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store, auth } = await loadRoute();

    const res = await GET(getRequest("", "https://evil.test"));
    expect(res.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
    expect(store.listConversations).not.toHaveBeenCalled();
  });

  it("preserves the admin boundary status with a generic, no-store envelope", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ authStatus: 401 });

    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(store.listConversations).not.toHaveBeenCalled();
  });

  it("returns 503 when the server operator identity is unavailable", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute({ identity: false });

    const res = await GET(getRequest());
    expect(res.status).toBe(503);
    expect(store.listConversations).not.toHaveBeenCalled();
  });

  it("rejects a malformed cursor or status with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { GET, store } = await loadRoute();

    for (const query of ["?cursor=@@bad@@", "?status=weird"]) {
      const res = await GET(getRequest(query));
      expect(res.status).toBe(400);
    }
    expect(store.listConversations).not.toHaveBeenCalled();
  });

  it("lists conversations with an opaque handle and derived unread counts", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.listConversations.mockResolvedValueOnce([LIST_ITEM]);
    const { GET } = await loadRoute({ store });

    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { conversations: Array<Record<string, unknown>>; nextCursor: string | null };
    };
    expect(body.data.conversations[0].unreadCount).toBe(2);
    expect(body.data.conversations[0]).not.toHaveProperty("id");
    expect(body.data.conversations[0].conversationHandle).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain("conversation-1");
    expect(store.listConversations).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: OPERATOR_ID, status: null, cursor: null })
    );
  });

  it("returns a next cursor only on a full page", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.listConversations.mockResolvedValueOnce([LIST_ITEM]);
    const { GET } = await loadRoute({ store });

    const full = await GET(getRequest("?limit=1"));
    const fullBody = (await full.json()) as { data: { nextCursor: string | null } };
    expect(fullBody.data.nextCursor).toEqual(expect.any(String));

    store.listConversations.mockResolvedValueOnce([LIST_ITEM, LIST_ITEM]);
    const partial = await GET(getRequest("?limit=5"));
    const partialBody = (await partial.json()) as { data: { nextCursor: string | null } };
    expect(partialBody.data.nextCursor).toBeNull();
  });

  it("returns a generic 503 on a database failure without leaking values", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = createStore();
    store.listConversations.mockRejectedValueOnce(new Error("boom"));
    const { GET } = await loadRoute({ store });

    const res = await GET(getRequest());
    expect(res.status).toBe(503);
    for (const call of spy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("Ana");
    }
    expect(spy).toHaveBeenCalled();
  });

  it("accepts an absent Origin for a same-origin browser read", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store = createStore();
    store.listConversations.mockResolvedValueOnce([LIST_ITEM]);
    const { GET } = await loadRoute({ store });

    const res = await GET(getRequest("", null));
    expect(res.status).toBe(200);
  });
});
