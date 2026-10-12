import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import type { Pool } from "mysql2/promise";

import {
  CONVERSATION_BOUND_DELETIONS,
  ChatPurgeInputError,
  DELETE_CONVERSATION_SQL,
  type ChatPurgeConnection,
  type ChatPurgeDatabase,
  createChatPurgeDatabase,
  purgeChatConversation,
} from "./purge";

const CONVERSATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

type ExecutedStatement = { sql: string; params: readonly unknown[] };

/**
 * In-memory purge transaction fake. It records the statements the service runs
 * and simulates commit/rollback so the transactional contract can be asserted
 * without a MariaDB instance.
 */
class FakePurgeDatabase implements ChatPurgeDatabase {
  executed: ExecutedStatement[] = [];
  transactionCalls = 0;
  commits = 0;
  rollbacks = 0;
  affectedRows = 1;
  failOnSql: string | null = null;

  async transaction<T>(
    work: (connection: ChatPurgeConnection) => Promise<T>
  ): Promise<T> {
    this.transactionCalls += 1;
    const connection: ChatPurgeConnection = {
      execute: async (sql, params) => {
        this.executed.push({ sql, params: [...params] });
        if (this.failOnSql === sql) {
          throw new Error("simulated statement failure");
        }
        return { affectedRows: this.affectedRows };
      },
    };

    try {
      const result = await work(connection);
      this.commits += 1;
      return result;
    } catch (error) {
      this.rollbacks += 1;
      throw error;
    }
  }
}

describe("purgeChatConversation — cascade intent", () => {
  it("deletes every conversation-bound table before the conversation row", async () => {
    const db = new FakePurgeDatabase();

    await purgeChatConversation(CONVERSATION_ID, db);

    const expectedOrder = [
      ...CONVERSATION_BOUND_DELETIONS.map((deletion) => deletion.sql),
      DELETE_CONVERSATION_SQL,
    ];
    expect(db.executed.map((entry) => entry.sql)).toEqual(expectedOrder);
  });

  it("binds the conversation id as a parameter for every statement", async () => {
    const db = new FakePurgeDatabase();

    await purgeChatConversation(CONVERSATION_ID, db);

    for (const entry of db.executed) {
      expect(entry.sql).toContain("?");
      expect(entry.sql).not.toContain(CONVERSATION_ID);
      expect(entry.params).toEqual([CONVERSATION_ID]);
    }
  });

  it("covers all conversation-bound tables declared by the purge plan", () => {
    const tables = CONVERSATION_BOUND_DELETIONS.map((deletion) => deletion.table);
    expect(new Set(tables).size).toBe(tables.length);
    expect(tables).toContain("chat_messages");
    expect(tables).toContain("visitor_chat_sessions");
    expect(tables).toContain("chat_resume_tokens");
    expect(tables).toContain("operator_conversation_reads");
    expect(tables).toContain("chat_email_outbox");
    expect(tables).toContain("chat_metrics_events");
    for (const deletion of CONVERSATION_BOUND_DELETIONS) {
      expect(deletion.sql).toContain(`DELETE FROM ${deletion.table}`);
    }
  });

  it("runs inside a single transaction", async () => {
    const db = new FakePurgeDatabase();

    await purgeChatConversation(CONVERSATION_ID, db);

    expect(db.transactionCalls).toBe(1);
    expect(db.commits).toBe(1);
    expect(db.rollbacks).toBe(0);
  });
});

describe("purgeChatConversation — no existence oracle", () => {
  it("resolves to undefined and never branches on affected rows", async () => {
    const db = new FakePurgeDatabase();
    db.affectedRows = 0;

    await expect(
      purgeChatConversation(CONVERSATION_ID, db)
    ).resolves.toBeUndefined();
    expect(db.executed).toHaveLength(
      CONVERSATION_BOUND_DELETIONS.length + 1
    );
  });

  it("is idempotent: a repeated purge re-runs the same statements and resolves", async () => {
    const db = new FakePurgeDatabase();

    await purgeChatConversation(CONVERSATION_ID, db);
    await expect(
      purgeChatConversation(CONVERSATION_ID, db)
    ).resolves.toBeUndefined();

    expect(db.transactionCalls).toBe(2);
    expect(db.executed).toHaveLength(
      (CONVERSATION_BOUND_DELETIONS.length + 1) * 2
    );
  });
});

describe("purgeChatConversation — input guards", () => {
  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["surrounding whitespace", ` ${CONVERSATION_ID} `],
    ["embedded null byte", "abc\u0000def"],
  ])("rejects an invalid id (%s) without touching the database", async (_label, id) => {
    const db = new FakePurgeDatabase();

    await expect(purgeChatConversation(id, db)).rejects.toBeInstanceOf(
      ChatPurgeInputError
    );
    expect(db.transactionCalls).toBe(0);
  });

  it("rejects an over-long id", async () => {
    const db = new FakePurgeDatabase();

    await expect(
      purgeChatConversation("a".repeat(192), db)
    ).rejects.toBeInstanceOf(ChatPurgeInputError);
    expect(db.transactionCalls).toBe(0);
  });

  it("rejects a non-string id", async () => {
    const db = new FakePurgeDatabase();

    await expect(
      purgeChatConversation(undefined as unknown as string, db)
    ).rejects.toBeInstanceOf(ChatPurgeInputError);
    expect(db.transactionCalls).toBe(0);
  });
});

describe("purgeChatConversation — failure handling", () => {
  it("propagates a failed statement and rolls back", async () => {
    const db = new FakePurgeDatabase();
    db.failOnSql = "DELETE FROM chat_messages WHERE conversation_id = ?";

    await expect(
      purgeChatConversation(CONVERSATION_ID, db)
    ).rejects.toThrow("simulated statement failure");
    expect(db.rollbacks).toBe(1);
    expect(db.commits).toBe(0);
  });
});

// ── Real mysql2 adapter (exercised through a mocked pool) ──

function createPurgeFakePool() {
  const connection = {
    beginTransaction: vi.fn(async () => undefined),
    execute: vi.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => [{ affectedRows: 1 }, []]
    ),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
  };
  const pool = {
    getConnection: vi.fn(async () => connection),
  };
  return { pool, connection };
}

describe("createChatPurgeDatabase", () => {
  it("runs the work on one connection, binds parameters, commits and releases", async () => {
    const { pool, connection } = createPurgeFakePool();
    const database = createChatPurgeDatabase(pool as unknown as Pool);

    const result = await database.transaction(async (tx) => {
      await tx.execute("DELETE FROM t WHERE id = ?", ["x"]);
      return "done";
    });

    expect(result).toBe("done");
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.execute).toHaveBeenCalledWith("DELETE FROM t WHERE id = ?", [
      "x",
    ]);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("maps the mysql2 result header to an affectedRows count", async () => {
    const { pool, connection } = createPurgeFakePool();
    connection.execute.mockResolvedValue([{ affectedRows: 3 }, []]);
    const database = createChatPurgeDatabase(pool as unknown as Pool);

    const affected = await database.transaction((tx) =>
      tx.execute("DELETE FROM t WHERE id = ?", ["x"])
    );

    expect(affected).toEqual({ affectedRows: 3 });
  });

  it("rolls back, releases and rethrows when the work fails", async () => {
    const { pool, connection } = createPurgeFakePool();
    connection.execute.mockRejectedValue(new Error("statement failed"));
    const database = createChatPurgeDatabase(pool as unknown as Pool);

    await expect(
      database.transaction((tx) => tx.execute("BROKEN", []))
    ).rejects.toThrow("statement failed");

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("drives the full purge plan through the real adapter over a mocked pool", async () => {
    const { pool, connection } = createPurgeFakePool();
    const database = createChatPurgeDatabase(pool as unknown as Pool);

    await purgeChatConversation(CONVERSATION_ID, database);

    const executedSql = connection.execute.mock.calls.map((call) =>
      String(call[0])
    );
    expect(executedSql).toEqual([
      ...CONVERSATION_BOUND_DELETIONS.map((deletion) => deletion.sql),
      DELETE_CONVERSATION_SQL,
    ]);
    for (const call of connection.execute.mock.calls) {
      expect(call[1]).toEqual([CONVERSATION_ID]);
    }
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
