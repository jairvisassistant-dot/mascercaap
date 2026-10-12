import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";
import { encodeConversationHandle } from "@/lib/chat/operator-conversations";

const OPERATOR_ID = "coordinator@example.com";
const HANDLE = encodeConversationHandle("conversation-1");

type MockStore = {
  closeConversation: ReturnType<typeof vi.fn>;
};

type LoadOptions = {
  enabled?: boolean;
  store?: MockStore;
  authStatus?: number | null;
  purgeRejects?: boolean;
};

async function loadRoute(options: LoadOptions = {}) {
  vi.resetModules();

  const store: MockStore = options.store ?? {
    closeConversation: vi.fn().mockResolvedValue(null),
  };
  const auth = vi
    .fn()
    .mockResolvedValue(
      options.authStatus == null
        ? null
        : NextResponse.json({ error: "boundary" }, { status: options.authStatus })
    );
  const purge = options.purgeRejects
    ? vi.fn().mockRejectedValue(new Error("boom"))
    : vi.fn().mockResolvedValue(undefined);

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
  vi.doMock("@/lib/chat/purge", () => ({
    purgeChatConversation: purge,
    createChatPurgeDatabase: () => ({ transaction: vi.fn() }),
  }));

  const route = await import("./route");
  return { POST: route.POST, store, auth, purge };
}

const VALID_ORIGIN = "https://mascercaap.com";

const CLOSED_DETAIL = {
  id: "conversation-1",
  status: "closed",
  visitorName: "Ana",
  visitorEmail: "ana@example.com",
  visitorPhone: null,
  assignedOperatorId: OPERATOR_ID,
  closeResult: "resuelto",
  closeNote: "ok",
  createdAt: new Date("2026-10-09T12:00:00.000Z"),
  updatedAt: new Date("2026-10-09T12:10:00.000Z"),
  lastMessageAt: null,
  closedAt: new Date("2026-10-09T12:10:00.000Z"),
  unreadCount: 0,
};

function postRequest(body: unknown, origin: string | null = VALID_ORIGIN): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request("http://localhost/api/chat/operator/close", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/operator/close", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/chat/config");
    vi.doUnmock("@/lib/chat/db");
    vi.doUnmock("@/lib/chat/operator-auth");
    vi.doUnmock("@/lib/chat/operator-conversations");
    vi.doUnmock("@/lib/chat/purge");
  });

  const CLOSE_BODY = { conversationHandle: HANDLE, closeResult: "resuelto" };

  it("returns a generic disabled response while CHAT_ENABLED is off", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ enabled: false });
    const res = await POST(postRequest(CLOSE_BODY));
    expect(res.status).toBe(404);
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin with a generic 403", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    const res = await POST(postRequest(CLOSE_BODY, "https://evil.test"));
    expect(res.status).toBe(403);
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with the boundary status", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute({ authStatus: 401 });
    const res = await POST(postRequest(CLOSE_BODY));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("requires one of the exact approved close classifications", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    for (const closeResult of ["", "algo", "resuelto ", "RESUELTO"]) {
      const res = await POST(postRequest({ conversationHandle: HANDLE, closeResult }));
      expect(res.status).toBe(400);
    }
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("rejects spoofed fields on the close payload", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, store } = await loadRoute();
    const res = await POST(postRequest({ ...CLOSE_BODY, operatorId: "attacker" }));
    expect(res.status).toBe(400);
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("closes with the classification and returns the support detail", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store: MockStore = {
      closeConversation: vi.fn().mockResolvedValueOnce(CLOSED_DETAIL),
    };
    const { POST } = await loadRoute({ store });

    const res = await POST(postRequest({ ...CLOSE_BODY, closeNote: "ok" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { conversation: Record<string, unknown> } };
    expect(body.data.conversation.status).toBe("closed");
    expect(body.data.conversation.closeResult).toBe("resuelto");
    expect(body.data.conversation).not.toHaveProperty("id");
    expect(store.closeConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        operatorId: OPERATOR_ID,
        closeResult: "resuelto",
        closeNote: "ok",
      })
    );
  });

  it("returns a generic 404 when the conversation is unknown", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST } = await loadRoute();
    const res = await POST(postRequest(CLOSE_BODY));
    expect(res.status).toBe(404);
  });

  it("refuses to purge without the explicit destructive confirmation", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, purge, store } = await loadRoute();
    const res = await POST(postRequest({ ...CLOSE_BODY, purge: true }));
    expect(res.status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("purges through the existing service with a constant non-enumerating response", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, purge, store } = await loadRoute();
    const res = await POST(postRequest({ ...CLOSE_BODY, purge: true, confirmPurge: true }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: { status: "purged" } });
    expect(purge).toHaveBeenCalledWith("conversation-1", expect.anything());
    // Purge never reads the conversation first and never calls the close writer.
    expect(store.closeConversation).not.toHaveBeenCalled();
  });

  it("resolves the same way when the purge target never existed", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST, purge } = await loadRoute();
    const res = await POST(
      postRequest({
        conversationHandle: encodeConversationHandle("missing"),
        closeResult: "resuelto",
        purge: true,
        confirmPurge: true,
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: { status: "purged" } });
    expect(purge).toHaveBeenCalledWith("missing", expect.anything());
  });

  it("returns a generic 503 when the purge transaction fails", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const { POST } = await loadRoute({ purgeRejects: true });
    const res = await POST(postRequest({ ...CLOSE_BODY, purge: true, confirmPurge: true }));
    expect(res.status).toBe(503);
  });

  it("returns a generic 503 on a close database failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", VALID_ORIGIN);
    const store: MockStore = {
      closeConversation: vi.fn().mockRejectedValueOnce(new Error("boom")),
    };
    const { POST } = await loadRoute({ store });
    const res = await POST(postRequest(CLOSE_BODY));
    expect(res.status).toBe(503);
  });
});
