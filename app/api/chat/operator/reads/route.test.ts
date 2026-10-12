import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";
import { encodeConversationHandle } from "@/lib/chat/operator-conversations";

const OPERATOR_ID = "coordinator@example.com";
const HANDLE = encodeConversationHandle("conversation-1");

type MockStore = {
  markConversationRead: ReturnType<typeof vi.fn>;
};

type LoadOptions = {
  enabled?: boolean;
  store?: MockStore;
  authStatus?: number | null;
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store: MockStore = options.store ?? {
    markConversationRead: vi.fn().mockResolvedValue(undefined),
  };
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
  return { POST: route.POST, store, auth };
}

const VALID_ORIGIN = "https://mascercaap.com";

function postRequest(body: unknown, origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request("http://localhost/api/chat/operator/reads", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/operator/reads", () => {
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
    const { POST, store } = await loadRoute({ enabled: false });
    const res = await POST(postRequest({ conversationHandle: HANDLE }));
    expect(res.status).toBe(404);
    expect(store.markConversationRead).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    const res = await POST(postRequest({ conversationHandle: HANDLE }, "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.markConversationRead).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with the boundary status", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ authStatus: 401 });
    const res = await POST(postRequest({ conversationHandle: HANDLE }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(store.markConversationRead).not.toHaveBeenCalled();
  });

  it("rejects a malformed handle or payload with a generic 400", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    for (const payload of [
      { conversationHandle: "@@bad@@" },
      { conversationHandle: HANDLE, operatorId: "attacker" },
      {},
    ]) {
      const res = await POST(postRequest(payload));
      expect(res.status).toBe(400);
    }
    expect(store.markConversationRead).not.toHaveBeenCalled();
  });

  it("marks the conversation read for the server-derived operator", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    const res = await POST(postRequest({ conversationHandle: HANDLE }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { unreadCount: number } };
    expect(body.data.unreadCount).toBe(0);
    expect(store.markConversationRead).toHaveBeenCalledWith({
      operatorId: OPERATOR_ID,
      conversationId: "conversation-1",
    });
  });

  it("does not reveal whether the conversation existed (non-enumerating)", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST } = await loadRoute();
    // The DAL resolves identically for a missing row; the route always answers 200.
    const res = await POST(postRequest({ conversationHandle: encodeConversationHandle("missing") }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: { unreadCount: 0 } });
  });

  it("returns a generic 503 on a database failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store: MockStore = {
      markConversationRead: vi.fn().mockRejectedValueOnce(new Error("boom")),
    };
    const { POST } = await loadRoute({ store });
    const res = await POST(postRequest({ conversationHandle: HANDLE }));
    expect(res.status).toBe(503);
  });
});
