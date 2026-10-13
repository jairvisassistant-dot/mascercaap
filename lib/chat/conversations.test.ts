import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  createVisitorConversationStore,
  isDuplicateKeyError,
  persistVisitorMessage,
  toVisitorConversationView,
  toVisitorMessageView,
  type ChatMessageRecord,
  type NewVisitorMessageInput,
  type VisitorConversationStore,
} from "./conversations";

const NOW = new Date("2026-10-09T12:34:56.789Z");

function messageRecord(overrides: Partial<ChatMessageRecord> = {}): ChatMessageRecord {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    senderType: "visitor",
    senderName: "Ana",
    body: "Hola",
    clientMessageId: "client-1",
    createdAt: NOW,
    ...overrides,
  };
}

const MESSAGE_INPUT: NewVisitorMessageInput = {
  id: "message-1",
  conversationId: "conversation-1",
  senderType: "visitor",
  senderName: "Ana",
  body: "Hola",
  clientMessageId: "client-1",
  createdAt: NOW,
};

describe("isDuplicateKeyError", () => {
  it("recognises a MySQL unique-constraint violation", () => {
    expect(isDuplicateKeyError({ code: "ER_DUP_ENTRY" })).toBe(true);
    expect(isDuplicateKeyError({ errno: 1062 })).toBe(true);
  });

  it("rejects unrelated errors and non-errors", () => {
    expect(isDuplicateKeyError(new Error("boom"))).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError("ER_DUP_ENTRY")).toBe(false);
  });
});

describe("view serializers", () => {
  it("never exposes the internal conversation id", () => {
    const view = toVisitorConversationView({
      id: "conversation-1",
      status: "open",
      visitorName: "Ana",
      createdAt: NOW,
      updatedAt: NOW,
      lastMessageAt: null,
    });
    expect(view).toEqual({ status: "open", createdAt: NOW.toISOString(), lastMessageAt: null });
    expect(Object.keys(view)).not.toContain("id");
    expect(Object.keys(view)).not.toContain("visitorName");
  });

  it("serializes a message view with ISO timestamps", () => {
    expect(toVisitorMessageView(messageRecord())).toEqual({
      id: "message-1",
      senderType: "visitor",
      body: "Hola",
      createdAt: NOW.toISOString(),
    });
  });
});

describe("persistVisitorMessage", () => {
  function createStore(): {
    store: VisitorConversationStore;
    findMessageByClientId: ReturnType<typeof vi.fn>;
    insertMessage: ReturnType<typeof vi.fn>;
  } {
    const findMessageByClientId = vi.fn().mockResolvedValue(null);
    const insertMessage = vi.fn().mockResolvedValue(undefined);
    return {
      store: {
        createConversationWithSession: vi.fn(),
        findConversationById: vi.fn(),
        listMessages: vi.fn(),
        findMessageByClientId,
        insertMessage,
      },
      findMessageByClientId,
      insertMessage,
    };
  }

  it("returns the stored message for a repeated client_message_id", async () => {
    const { store, insertMessage } = createStore();
    const existing = messageRecord();
    (store.findMessageByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await expect(persistVisitorMessage(MESSAGE_INPUT, store)).resolves.toEqual({
      message: existing,
      duplicated: true,
    });
    expect(insertMessage).not.toHaveBeenCalled();
  });

  it("persists a new message once", async () => {
    const { store, insertMessage } = createStore();
    await expect(persistVisitorMessage(MESSAGE_INPUT, store)).resolves.toEqual({
      message: { ...MESSAGE_INPUT },
      duplicated: false,
    });
    expect(insertMessage).toHaveBeenCalledWith(MESSAGE_INPUT);
  });

  it("recovers the winner of a concurrent duplicate insert", async () => {
    const { store, findMessageByClientId, insertMessage } = createStore();
    findMessageByClientId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(messageRecord({ id: "winner" }));
    insertMessage.mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });

    await expect(persistVisitorMessage(MESSAGE_INPUT, store)).resolves.toEqual({
      message: messageRecord({ id: "winner" }),
      duplicated: true,
    });
  });

  it("propagates a non-duplicate insert failure", async () => {
    const { store, insertMessage } = createStore();
    insertMessage.mockRejectedValueOnce(new Error("connection reset"));
    await expect(persistVisitorMessage(MESSAGE_INPUT, store)).rejects.toThrow("connection reset");
  });

  it("rethrows the duplicate error when the winning row cannot be read", async () => {
    const { store, insertMessage } = createStore();
    insertMessage.mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });
    await expect(persistVisitorMessage(MESSAGE_INPUT, store)).rejects.toMatchObject({
      code: "ER_DUP_ENTRY",
    });
  });
});

function createPoolMock() {
  const connection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  const pool = {
    getConnection: vi.fn().mockResolvedValue(connection),
    execute: vi.fn().mockResolvedValue([[], []]),
  };
  return { pool, connection };
}

describe("createVisitorConversationStore", () => {
  it("creates the conversation and its session in one committed transaction", async () => {
    const { pool, connection } = createPoolMock();
    const store = createVisitorConversationStore(pool as never);

    await store.createConversationWithSession({
      conversationId: "conversation-1",
      visitorName: "Ana",
      visitorEmail: "ana@example.com",
      visitorPhone: null,
      sessionId: "session-1",
      sessionHash: "hash",
      sessionCreatedAt: NOW,
      sessionLastSeenAt: NOW,
      sessionExpiresAt: new Date(NOW.getTime() + 60_000),
      now: NOW,
    });

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.execute).toHaveBeenCalledTimes(2);
    const firstSql = connection.execute.mock.calls[0][0] as string;
    const secondSql = connection.execute.mock.calls[1][0] as string;
    expect(firstSql).toContain("INSERT INTO chat_conversations");
    expect(secondSql).toContain("INSERT INTO visitor_chat_sessions");
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    // Values are always bound, never interpolated.
    expect(firstSql).not.toContain("ana@example.com");
    expect(connection.execute.mock.calls[1][1]).toEqual([
      "session-1",
      "conversation-1",
      "hash",
      NOW,
      NOW,
      new Date(NOW.getTime() + 60_000),
    ]);
  });

  it("rolls back and releases the connection when the transaction fails", async () => {
    const { pool, connection } = createPoolMock();
    connection.execute.mockRejectedValueOnce(new Error("unique violation"));
    const store = createVisitorConversationStore(pool as never);

    await expect(
      store.createConversationWithSession({
        conversationId: "c",
        visitorName: "A",
        visitorEmail: "a@b.co",
        visitorPhone: null,
        sessionId: "s",
        sessionHash: "h",
        sessionCreatedAt: NOW,
        sessionLastSeenAt: NOW,
        sessionExpiresAt: NOW,
        now: NOW,
      })
    ).rejects.toThrow("unique violation");
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it("reads a conversation by id without exposing extra columns", async () => {
    const { pool } = createPoolMock();
    pool.execute.mockResolvedValueOnce([
      [
        {
          id: "conversation-1",
          status: "open",
          visitor_name: "Ana",
          created_at: NOW,
          updated_at: NOW,
          last_message_at: null,
        },
      ],
      [],
    ]);
    const store = createVisitorConversationStore(pool as never);

    await expect(store.findConversationById("conversation-1")).resolves.toEqual({
      id: "conversation-1",
      status: "open",
      visitorName: "Ana",
      createdAt: NOW,
      updatedAt: NOW,
      lastMessageAt: null,
    });
    const [sql, params] = pool.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM chat_conversations WHERE id = ?");
    expect(params).toEqual(["conversation-1"]);
  });

  it("lists the newest messages first without a cursor", async () => {
    const { pool } = createPoolMock();
    const store = createVisitorConversationStore(pool as never);

    await store.listMessages({ conversationId: "conversation-1", cursor: null, limit: 50 });

    const [sql, params] = pool.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("ORDER BY created_at DESC, id DESC");
    expect(sql).toContain("LIMIT ?");
    expect(sql).not.toContain("created_at < ?");
    expect(params).toEqual(["conversation-1", 50]);
  });

  it("binds the composite (created_at, id) cursor predicate", async () => {
    const { pool } = createPoolMock();
    const store = createVisitorConversationStore(pool as never);
    const cursor = { createdAt: "2026-10-09T12:00:00.000Z", id: "message-9" };

    await store.listMessages({ conversationId: "conversation-1", cursor, limit: 20 });

    const [sql, params] = pool.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("created_at < ? OR (created_at = ? AND id < ?)");
    expect(params).toEqual([
      "conversation-1",
      new Date("2026-10-09T12:00:00.000Z"),
      new Date("2026-10-09T12:00:00.000Z"),
      "message-9",
      20,
    ]);
  });

  it("finds an existing message by client_message_id", async () => {
    const { pool } = createPoolMock();
    pool.execute.mockResolvedValueOnce([
      [
        {
          id: "message-1",
          conversation_id: "conversation-1",
          sender_type: "visitor",
          sender_name: "Ana",
          body: "Hola",
          client_message_id: "client-1",
          created_at: NOW,
        },
      ],
      [],
    ]);
    const store = createVisitorConversationStore(pool as never);

    await expect(
      store.findMessageByClientId({ conversationId: "conversation-1", clientMessageId: "client-1" })
    ).resolves.toEqual(messageRecord());
  });

  it("inserts a message and touches the conversation in one transaction", async () => {
    const { pool, connection } = createPoolMock();
    const store = createVisitorConversationStore(pool as never);

    await store.insertMessage(MESSAGE_INPUT);

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    const insertSql = connection.execute.mock.calls[0][0] as string;
    const touchSql = connection.execute.mock.calls[1][0] as string;
    expect(insertSql).toContain("INSERT INTO chat_messages");
    expect(touchSql).toContain("UPDATE chat_conversations SET last_message_at");
    expect(connection.execute.mock.calls[1][1]).toEqual([NOW, NOW, "conversation-1"]);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back the message insert when the unique key conflicts", async () => {
    const { pool, connection } = createPoolMock();
    connection.execute.mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });
    const store = createVisitorConversationStore(pool as never);

    await expect(store.insertMessage(MESSAGE_INPUT)).rejects.toMatchObject({
      code: "ER_DUP_ENTRY",
    });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
