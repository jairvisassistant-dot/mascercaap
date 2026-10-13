import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the DAL.
vi.mock("server-only", () => ({}));

import type { ChatMessageRecord } from "./conversations";
import {
  OPERATOR_INBOX_DEFAULT_LIMIT,
  OPERATOR_INBOX_MAX_LIMIT,
  createOperatorConversationStore,
  decodeConversationHandle,
  encodeConversationHandle,
  isUsableCursorDate,
  persistOperatorReply,
  toOperatorConversationDetailView,
  toOperatorConversationListItemView,
  toOperatorMessageView,
  type NewOperatorMessageInput,
  type OperatorConversationDetail,
  type OperatorConversationListItem,
} from "./operator-conversations";

/**
 * Unit tests for the coordinator inbox DAL.
 *
 * Database access is exercised through a fake mysql2 pool so every assertion is
 * about the SQL contract (bound parameters, monotonic upsert, conditional close,
 * lone transaction) and the serializers, never about a live MariaDB instance.
 */

type FakeConnection = {
  beginTransaction: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
};

function createFakePool() {
  const execute = vi.fn();
  const connection: FakeConnection = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
  };
  const pool = {
    execute,
    getConnection: vi.fn().mockResolvedValue(connection),
  };
  return { pool, execute, connection };
}

function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conversation-1",
    status: "open",
    visitor_name: "Ana",
    assigned_operator_id: null,
    close_result: null,
    created_at: new Date("2026-10-09T12:00:00.000Z"),
    updated_at: new Date("2026-10-09T12:05:00.000Z"),
    closed_at: null,
    last_message_at: new Date("2026-10-09T12:05:00.000Z"),
    unread_count: 2,
    ...overrides,
  };
}

const OPERATOR_ID = "coordinator@example.com";

describe("conversation handle codec", () => {
  it("round-trips an internal id without exposing it literally", () => {
    const handle = encodeConversationHandle("9f1c2b3a-0000-4000-8000-000000000000");
    expect(handle).not.toContain("9f1c2b3a");
    expect(decodeConversationHandle(handle)).toBe("9f1c2b3a-0000-4000-8000-000000000000");
  });

  it("returns null for missing or malformed handles", () => {
    expect(decodeConversationHandle(null)).toBeNull();
    expect(decodeConversationHandle(undefined)).toBeNull();
    expect(decodeConversationHandle("")).toBeNull();
    expect(decodeConversationHandle("not-base64-json")).toBeNull();
    expect(decodeConversationHandle(Buffer.from("{\"i\":\"\"}", "utf8").toString("base64url"))).toBeNull();
  });

  it("flags a decoded cursor whose timestamp is not a real date", () => {
    expect(isUsableCursorDate("2026-10-09T12:00:00.000Z")).toBe(true);
    expect(isUsableCursorDate("not-a-date")).toBe(false);
  });
});

describe("createOperatorConversationStore.listConversations", () => {
  it("binds the operator id and returns derived unread counts", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([[listRow(), listRow({ id: "conversation-2", unread_count: 0 })]]);
    const store = createOperatorConversationStore(pool as never);

    const items = await store.listConversations({
      operatorId: OPERATOR_ID,
      status: null,
      cursor: null,
      limit: OPERATOR_INBOX_DEFAULT_LIMIT,
    });

    expect(items).toHaveLength(2);
    expect(items[0].unreadCount).toBe(2);
    expect(items[1].unreadCount).toBe(0);

    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("LEFT JOIN operator_conversation_reads");
    expect(sql).toContain("sender_type <> 'operator'");
    expect(sql).not.toContain("unread_count =");
    expect(params[0]).toBe(OPERATOR_ID);
    expect(params[params.length - 1]).toBe(OPERATOR_INBOX_DEFAULT_LIMIT);
  });

  it("adds a status filter and a composite activity cursor as bound parameters", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([[]]);
    const store = createOperatorConversationStore(pool as never);

    await store.listConversations({
      operatorId: OPERATOR_ID,
      status: "assigned",
      cursor: { createdAt: "2026-10-09T12:00:00.000Z", id: "conversation-9" },
      limit: 10,
    });

    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("c.status = ?");
    expect(sql).toContain("COALESCE(c.last_message_at, c.created_at) < ?");
    expect(params).toEqual([
      OPERATOR_ID,
      "assigned",
      new Date("2026-10-09T12:00:00.000Z"),
      new Date("2026-10-09T12:00:00.000Z"),
      "conversation-9",
      10,
    ]);
  });
});

describe("createOperatorConversationStore.findConversationById", () => {
  it("returns the support detail including contact fields", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([
      [
        {
          id: "conversation-1",
          status: "assigned",
          visitor_name: "Ana",
          visitor_email: "ana@example.com",
          visitor_phone: "+57 300 000 0000",
          assigned_operator_id: OPERATOR_ID,
          close_result: null,
          close_note: null,
          created_at: new Date("2026-10-09T12:00:00.000Z"),
          updated_at: new Date("2026-10-09T12:05:00.000Z"),
          closed_at: null,
          last_message_at: null,
        },
      ],
    ]);
    const store = createOperatorConversationStore(pool as never);

    const detail = await store.findConversationById("conversation-1");
    expect(detail?.visitorEmail).toBe("ana@example.com");
    expect(detail?.visitorPhone).toBe("+57 300 000 0000");
    expect(execute.mock.calls[0][1]).toEqual(["conversation-1"]);
  });

  it("returns null when the conversation does not exist", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([[]]);
    const store = createOperatorConversationStore(pool as never);
    await expect(store.findConversationById("missing")).resolves.toBeNull();
  });
});

describe("createOperatorConversationStore.markConversationRead", () => {
  it("performs one atomic monotonic upsert so the cursor never regresses", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const store = createOperatorConversationStore(pool as never);

    await store.markConversationRead({ operatorId: OPERATOR_ID, conversationId: "conversation-1" });

    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("INSERT INTO operator_conversation_reads");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(sql).toContain("GREATEST(last_read_at, VALUES(last_read_at))");
    expect(params).toEqual([OPERATOR_ID, "conversation-1"]);
  });
});

describe("createOperatorConversationStore.closeConversation", () => {
  it("closes with a conditional update and reads the final row back", async () => {
    const { pool, execute } = createFakePool();
    execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([
        [
          {
            id: "conversation-1",
            status: "closed",
            visitor_name: "Ana",
            visitor_email: "ana@example.com",
            visitor_phone: null,
            assigned_operator_id: OPERATOR_ID,
            close_result: "resuelto",
            close_note: "ok",
            created_at: new Date("2026-10-09T12:00:00.000Z"),
            updated_at: new Date("2026-10-09T12:10:00.000Z"),
            closed_at: new Date("2026-10-09T12:10:00.000Z"),
            last_message_at: null,
          },
        ],
      ]);
    const store = createOperatorConversationStore(pool as never);

    const detail = await store.closeConversation({
      conversationId: "conversation-1",
      operatorId: OPERATOR_ID,
      closeResult: "resuelto",
      closeNote: "ok",
      now: new Date("2026-10-09T12:10:00.000Z"),
    });

    const [updateSql, updateParams] = execute.mock.calls[0];
    expect(updateSql).toContain("status = 'closed'");
    expect(updateSql).toContain("status <> 'closed'");
    expect(updateParams[0]).toBe("resuelto");
    expect(detail?.status).toBe("closed");
    expect(detail?.closeResult).toBe("resuelto");
  });

  it("returns null when the conversation disappears", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([{ affectedRows: 0 }]).mockResolvedValueOnce([[]]);
    const store = createOperatorConversationStore(pool as never);

    await expect(
      store.closeConversation({
        conversationId: "missing",
        operatorId: OPERATOR_ID,
        closeResult: "resuelto",
        closeNote: null,
        now: new Date(),
      })
    ).resolves.toBeNull();
  });
});

describe("createOperatorConversationStore.insertMessage", () => {
  const input: NewOperatorMessageInput = {
    id: "message-1",
    conversationId: "conversation-1",
    senderType: "operator",
    senderName: OPERATOR_ID,
    body: "Hola",
    clientMessageId: "reply-123456",
    operatorId: OPERATOR_ID,
    createdAt: new Date("2026-10-09T12:06:00.000Z"),
  };

  it("assigns, inserts and touches inside one transaction", async () => {
    const { pool, connection } = createFakePool();
    const store = createOperatorConversationStore(pool as never);

    await store.insertMessage(input);

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);

    const assignSql = connection.execute.mock.calls[0][0] as string;
    expect(assignSql).toContain("assigned_operator_id = COALESCE(assigned_operator_id, ?)");
    expect(assignSql).toContain("status = CASE WHEN status = 'open' THEN 'assigned'");
    const insertSql = connection.execute.mock.calls[1][0] as string;
    expect(insertSql).toContain("INSERT INTO chat_messages");
  });

  it("rolls the whole unit back when the insert fails", async () => {
    const { pool, connection } = createFakePool();
    connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" }));
    const store = createOperatorConversationStore(pool as never);

    await expect(store.insertMessage(input)).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });
});

describe("persistOperatorReply", () => {
  const input: NewOperatorMessageInput = {
    id: "message-1",
    conversationId: "conversation-1",
    senderType: "operator",
    senderName: OPERATOR_ID,
    body: "Hola",
    clientMessageId: "reply-123456",
    operatorId: OPERATOR_ID,
    createdAt: new Date("2026-10-09T12:06:00.000Z"),
  };

  function storeStub() {
    return {
      findMessageByClientId: vi.fn(),
      insertMessage: vi.fn(),
    };
  }

  it("persists a fresh reply", async () => {
    const store = storeStub();
    store.findMessageByClientId.mockResolvedValueOnce(null);
    store.insertMessage.mockResolvedValueOnce(undefined);

    const result = await persistOperatorReply(input, store);
    expect(result.duplicated).toBe(false);
    expect(result.message).toEqual({
      id: "message-1",
      conversationId: "conversation-1",
      senderType: "operator",
      senderName: OPERATOR_ID,
      body: "Hola",
      clientMessageId: "reply-123456",
      createdAt: input.createdAt,
    });
    expect(store.insertMessage).toHaveBeenCalledWith(input);
  });

  it("returns the stored reply for a repeated idempotency key", async () => {
    const store = storeStub();
    const existing: ChatMessageRecord = {
      id: "message-1",
      conversationId: "conversation-1",
      senderType: "operator",
      senderName: OPERATOR_ID,
      body: "Hola",
      clientMessageId: "reply-123456",
      createdAt: input.createdAt,
    };
    store.findMessageByClientId.mockResolvedValueOnce(existing);

    const result = await persistOperatorReply(input, store);
    expect(result.duplicated).toBe(true);
    expect(store.insertMessage).not.toHaveBeenCalled();
  });

  it("reconciles a concurrent duplicate insert", async () => {
    const store = storeStub();
    const winner: ChatMessageRecord = {
      id: "winner",
      conversationId: "conversation-1",
      senderType: "operator",
      senderName: OPERATOR_ID,
      body: "Hola",
      clientMessageId: "reply-123456",
      createdAt: input.createdAt,
    };
    store.findMessageByClientId.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    store.insertMessage.mockRejectedValueOnce(Object.assign(new Error("dup"), { errno: 1062 }));

    const result = await persistOperatorReply(input, store);
    expect(result.duplicated).toBe(true);
    expect(result.message.id).toBe("winner");
  });
});

describe("operator serializers", () => {
  const item: OperatorConversationListItem = {
    id: "conversation-internal",
    status: "open",
    visitorName: "Ana",
    assignedOperatorId: null,
    closeResult: null,
    createdAt: new Date("2026-10-09T12:00:00.000Z"),
    updatedAt: new Date("2026-10-09T12:00:00.000Z"),
    lastMessageAt: null,
    closedAt: null,
    unreadCount: 3,
  };

  it("exposes a handle, not the internal id, in the list view", () => {
    const view = toOperatorConversationListItemView(item);
    expect(view).not.toHaveProperty("id");
    expect(view.unreadCount).toBe(3);
    expect(JSON.stringify(view)).not.toContain("conversation-internal");
    expect(decodeConversationHandle(view.conversationHandle)).toBe("conversation-internal");
  });

  it("adds contact fields and the close note to the detail view", () => {
    const detail: OperatorConversationDetail = {
      ...item,
      visitorEmail: "ana@example.com",
      visitorPhone: "+57 300 000 0000",
      closeNote: "nota",
    };
    const view = toOperatorConversationDetailView(detail);
    expect(view.visitorEmail).toBe("ana@example.com");
    expect(view.visitorPhone).toBe("+57 300 000 0000");
    expect(view.closeNote).toBe("nota");
  });

  it("serializes a message to the minimal support shape", () => {
    const view = toOperatorMessageView({
      id: "message-1",
      conversationId: "conversation-internal",
      senderType: "visitor",
      senderName: "Ana",
      body: "hola",
      clientMessageId: null,
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
    });
    expect(view).toEqual({
      id: "message-1",
      senderType: "visitor",
      body: "hola",
      createdAt: "2026-10-09T12:00:00.000Z",
    });
  });
});

describe("inbox limits", () => {
  it("keeps a bounded default and max page size", () => {
    expect(OPERATOR_INBOX_DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(OPERATOR_INBOX_MAX_LIMIT).toBeGreaterThanOrEqual(OPERATOR_INBOX_DEFAULT_LIMIT);
    expect(OPERATOR_INBOX_MAX_LIMIT).toBeLessThanOrEqual(100);
  });
});

describe("createOperatorConversationStore.listMessages", () => {
  it("reuses the visitor message reader for history", async () => {
    const { pool, execute } = createFakePool();
    execute.mockResolvedValueOnce([
      [
        {
          id: "message-1",
          conversation_id: "conversation-1",
          sender_type: "visitor",
          sender_name: "Ana",
          body: "hola",
          client_message_id: null,
          created_at: new Date("2026-10-09T12:00:00.000Z"),
        },
      ],
    ]);
    const store = createOperatorConversationStore(pool as never);

    const messages = await store.listMessages({
      conversationId: "conversation-1",
      cursor: null,
      limit: 50,
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("message-1");
  });
});
