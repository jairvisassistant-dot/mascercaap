import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import type { Pool } from "mysql2/promise";

import {
  CONVERSATION_BOUND_DELETIONS,
  DELETE_CONVERSATION_SQL,
  type ChatPurgeConnection,
  type ChatPurgeDatabase,
} from "./purge";
import {
  CHAT_RETENTION_BATCH_LIMIT_DEFAULT,
  CHAT_RETENTION_BATCH_LIMIT_MAX,
  CHAT_RETENTION_MAX_OLDER_THAN_DAYS,
  CHAT_RETENTION_MIN_OLDER_THAN_DAYS,
  ChatRetentionInputError,
  CLAIM_CLOSED_CONVERSATION_SQL,
  SELECT_RETENTION_CANDIDATES_SQL,
  buildRetentionCandidateSelector,
  clampRetentionBatchLimit,
  createRetentionCandidateStore,
  parseRetentionOlderThanDays,
  runRetentionCleanup,
  type RetentionCandidateSelector,
} from "./retention";

const NOW = new Date("2026-10-10T00:00:00.000Z");
const CONVERSATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

type ExecutedStatement = { readonly sql: string; readonly params: readonly unknown[] };

/**
 * Behaviorally faithful fake of the claim-guarded purge transaction.
 *
 * It models the InnoDB semantics the real claim relies on: the guard UPDATE
 * takes the row lock and holds it until commit, so a second concurrent runner
 * sees the row as already gone. The claimed row is therefore removed at claim
 * time and restored only if the transaction rolls back.
 */
class FakeRetentionPurgeDatabase implements ChatPurgeDatabase {
  readonly liveClosed = new Map<string, Date>();
  readonly executed: ExecutedStatement[] = [];
  readonly statementCounts = new Map<string, number>();
  /** Conversation rows actually removed by `DELETE FROM chat_conversations`. */
  deleteConversationCalls = 0;
  transactions = 0;
  commits = 0;
  rollbacks = 0;
  failOnSql: string | null = null;

  constructor(closed: Array<[string, Date]> = []) {
    for (const [id, closedAt] of closed) this.liveClosed.set(id, closedAt);
  }

  private count(sql: string): void {
    this.statementCounts.set(sql, (this.statementCounts.get(sql) ?? 0) + 1);
  }

  async transaction<T>(work: (connection: ChatPurgeConnection) => Promise<T>): Promise<T> {
    this.transactions += 1;
    const claimed: string[] = [];

    const connection: ChatPurgeConnection = {
      execute: async (sql, params) => {
        this.executed.push({ sql, params: [...params] });
        this.count(sql);
        if (this.failOnSql === sql) throw new Error("simulated statement failure");

        if (sql === CLAIM_CLOSED_CONVERSATION_SQL) {
          const id = String(params[0]);
          const status = params[1];
          const cutoff = params[2] as Date; // [id, status, cutoff]
          const closedAt = this.liveClosed.get(id);
          const eligible =
            status === "closed" &&
            closedAt !== undefined &&
            closedAt.getTime() < cutoff.getTime();
          if (!eligible) return { affectedRows: 0 };
          // Claim = row lock held until commit: the row disappears for any
          // concurrent runner and is restored if this transaction rolls back.
          this.liveClosed.delete(id);
          claimed.push(id);
          return { affectedRows: 1 };
        }

        if (sql === DELETE_CONVERSATION_SQL) {
          this.deleteConversationCalls += 1;
          return { affectedRows: 1 };
        }

        return { affectedRows: 1 };
      },
    };

    try {
      const result = await work(connection);
      this.commits += 1;
      return result;
    } catch (error) {
      this.rollbacks += 1;
      for (const id of claimed) {
        if (!this.liveClosed.has(id)) this.liveClosed.set(id, NOW);
      }
      throw error;
    }
  }
}

function createStore(ids: readonly string[]) {
  return {
    listCandidates: vi.fn(
      async (selector: RetentionCandidateSelector): Promise<readonly string[]> => {
        void selector;
        return ids;
      }
    ),
  };
}

describe("buildRetentionCandidateSelector — cleanup selector", () => {
  it("selects only closed conversations older than the requested window", () => {
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(selector.sql).toContain("FROM chat_conversations");
    expect(selector.sql).toContain("status = ?");
    expect(selector.sql).toContain("closed_at IS NOT NULL");
    expect(selector.sql).toContain("closed_at < ?");
    expect(selector.params[0]).toBe("closed");
    expect(selector.params[1]).toEqual(new Date(NOW.getTime() - 30 * 86_400_000));
    expect(selector.params[1]).toBeInstanceOf(Date);
  });

  it("never selects an open or assigned conversation", () => {
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 1,
      limit: 5,
      now: NOW,
    });

    expect(selector.sql).not.toMatch(/'open'/);
    expect(selector.sql).not.toMatch(/assigned/);
    expect(selector.sql).not.toContain("status <>");
    expect(selector.params).not.toContain("open");
    expect(selector.params).not.toContain("assigned");
  });

  it("orders deterministically by (closed_at, id) and bounds the batch with LIMIT", () => {
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 7,
      limit: 25,
      now: NOW,
    });

    expect(selector.sql).toContain("ORDER BY closed_at ASC, id ASC");
    expect(selector.sql).toContain("LIMIT ?");
    expect(selector.params[2]).toBe(25);
    expect(selector.params).toHaveLength(3);
  });

  it("binds every value as a parameter and never interpolates", () => {
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 90,
      limit: 3,
      now: NOW,
    });

    expect(selector.sql).not.toContain("90");
    expect(selector.sql).not.toContain(NOW.toISOString());
    expect(selector.sql).not.toContain("2026-");
    for (const value of selector.params) {
      expect(typeof value === "string" || value instanceof Date || typeof value === "number").toBe(
        true
      );
    }
  });

  it("never reads or writes consent-contact rows", () => {
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(selector.sql).not.toContain("chat_contact_consents");
    expect(selector.sql).not.toContain("JOIN");
    expect(CLAIM_CLOSED_CONVERSATION_SQL).not.toContain("chat_contact_consents");
  });

  it("freezes the shipped statement as a single-table, non-enumerating read", () => {
    expect(SELECT_RETENTION_CANDIDATES_SQL).toContain(
      "SELECT id FROM chat_conversations"
    );
    expect(SELECT_RETENTION_CANDIDATES_SQL).not.toContain("*");
  });
});

describe("parseRetentionOlderThanDays / clampRetentionBatchLimit", () => {
  it("rejects a missing retention window (no default production period)", () => {
    expect(parseRetentionOlderThanDays(null)).toBeNull();
    expect(parseRetentionOlderThanDays("")).toBeNull();
  });

  it.each([
    ["zero", "0"],
    ["negative", "-3"],
    ["fractional", "1.5"],
    ["not a number", "abc"],
    ["overflow", String(CHAT_RETENTION_MAX_OLDER_THAN_DAYS + 1)],
  ])("rejects an invalid retention window (%s)", (_label, raw) => {
    expect(parseRetentionOlderThanDays(raw)).toBeNull();
  });

  it("accepts a bounded integer window", () => {
    expect(parseRetentionOlderThanDays("30")).toBe(30);
    expect(parseRetentionOlderThanDays(String(CHAT_RETENTION_MIN_OLDER_THAN_DAYS))).toBe(
      CHAT_RETENTION_MIN_OLDER_THAN_DAYS
    );
    expect(parseRetentionOlderThanDays(String(CHAT_RETENTION_MAX_OLDER_THAN_DAYS))).toBe(
      CHAT_RETENTION_MAX_OLDER_THAN_DAYS
    );
  });

  it("clamps the batch limit to a bounded positive integer", () => {
    expect(clampRetentionBatchLimit(null)).toBe(CHAT_RETENTION_BATCH_LIMIT_DEFAULT);
    expect(clampRetentionBatchLimit("abc")).toBe(CHAT_RETENTION_BATCH_LIMIT_DEFAULT);
    expect(clampRetentionBatchLimit("0")).toBe(CHAT_RETENTION_BATCH_LIMIT_DEFAULT);
    expect(clampRetentionBatchLimit("-5")).toBe(CHAT_RETENTION_BATCH_LIMIT_DEFAULT);
    expect(clampRetentionBatchLimit("7")).toBe(7);
    expect(clampRetentionBatchLimit("100000")).toBe(CHAT_RETENTION_BATCH_LIMIT_MAX);
  });

  it("exposes a bounded window range", () => {
    expect(CHAT_RETENTION_MIN_OLDER_THAN_DAYS).toBeGreaterThanOrEqual(1);
    expect(CHAT_RETENTION_MAX_OLDER_THAN_DAYS).toBeGreaterThan(
      CHAT_RETENTION_MIN_OLDER_THAN_DAYS
    );
  });
});

describe("runRetentionCleanup — purging candidates", () => {
  it("purges every eligible candidate through the transactional purge plan", async () => {
    const closedAt = new Date(NOW.getTime() - 40 * 86_400_000);
    const db = new FakeRetentionPurgeDatabase([
      [CONVERSATION_ID, closedAt],
      ["8b7d2a44-1111-4222-8333-444455556666", closedAt],
    ]);
    const store = createStore([CONVERSATION_ID, "8b7d2a44-1111-4222-8333-444455556666"]);

    const report = await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(report).toEqual({
      scanned: 2,
      purged: 2,
      skipped_open: 0,
      dryRun: false,
    });
    expect(db.deleteConversationCalls).toBe(2);
    expect(db.commits).toBe(2);
    expect(db.rollbacks).toBe(0);

    // The claim guard runs first, inside the same transaction as the purge plan.
    const firstTransactionSql = db.executed.slice(0, CONVERSATION_BOUND_DELETIONS.length + 2);
    expect(firstTransactionSql[0].sql).toBe(CLAIM_CLOSED_CONVERSATION_SQL);
    expect(firstTransactionSql[0].params[0]).toBe(CONVERSATION_ID);
    const planSql = db.executed.map((entry) => entry.sql).filter((sql) => sql !== CLAIM_CLOSED_CONVERSATION_SQL);
    expect(planSql).toEqual([
      ...CONVERSATION_BOUND_DELETIONS.map((deletion) => deletion.sql),
      DELETE_CONVERSATION_SQL,
      ...CONVERSATION_BOUND_DELETIONS.map((deletion) => deletion.sql),
      DELETE_CONVERSATION_SQL,
    ]);
  });

  it("builds the selector from the requested window, limit and run time", async () => {
    const db = new FakeRetentionPurgeDatabase();
    const store = createStore([]);

    await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 45,
      limit: 9,
      now: NOW,
    });

    expect(store.listCandidates).toHaveBeenCalledWith(
      buildRetentionCandidateSelector({ olderThanDays: 45, limit: 9, now: NOW })
    );
    expect(db.transactions).toBe(0);
  });

  it("skips a candidate that is no longer eligible instead of purging it", async () => {
    // No live row: the guard reports zero and the purge plan never runs.
    const db = new FakeRetentionPurgeDatabase();
    const store = createStore([CONVERSATION_ID]);

    const report = await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(report).toEqual({
      scanned: 1,
      purged: 0,
      skipped_open: 1,
      dryRun: false,
    });
    expect(db.executed).toHaveLength(1);
    expect(db.executed[0].sql).toBe(CLAIM_CLOSED_CONVERSATION_SQL);
    expect(db.deleteConversationCalls).toBe(0);
    expect(db.rollbacks).toBe(1);
    expect(db.commits).toBe(0);
  });

  it("skips a candidate that reopened (status no longer closed)", async () => {
    const db = new FakeRetentionPurgeDatabase();
    // A reopened row is not in `liveClosed`, so the guard fails exactly like a
    // missing row: the runner reports it as skipped, never as purged.
    const store = createStore([CONVERSATION_ID]);

    const report = await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(report.skipped_open).toBe(1);
    expect(report.purged).toBe(0);
    expect(db.deleteConversationCalls).toBe(0);
  });

  it("never scans more candidates than the requested batch limit", async () => {
    const db = new FakeRetentionPurgeDatabase();
    const store = createStore([]);

    await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 4,
      now: NOW,
    });

    const selector = store.listCandidates.mock.calls[0][0] as {
      params: readonly unknown[];
    };
    expect(selector.params[2]).toBe(4);
  });
});

describe("runRetentionCleanup — dry run", () => {
  it("counts the candidates and deletes nothing", async () => {
    const db = new FakeRetentionPurgeDatabase([
      [CONVERSATION_ID, new Date(NOW.getTime() - 90 * 86_400_000)],
    ]);
    const store = createStore([CONVERSATION_ID, "another-id"]);

    const report = await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
      dryRun: true,
    });

    expect(report).toEqual({
      scanned: 2,
      purged: 0,
      skipped_open: 0,
      dryRun: true,
    });
    expect(store.listCandidates).toHaveBeenCalledTimes(1);
    expect(db.transactions).toBe(0);
    expect(db.executed).toHaveLength(0);
    expect(db.liveClosed.has(CONVERSATION_ID)).toBe(true);
  });
});

describe("runRetentionCleanup — idempotency", () => {
  it("reports a second run over an already-purged set as zero work", async () => {
    const closedAt = new Date(NOW.getTime() - 60 * 86_400_000);
    const db = new FakeRetentionPurgeDatabase([[CONVERSATION_ID, closedAt]]);
    const store = createStore([CONVERSATION_ID]);

    const first = await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });
    expect(first.purged).toBe(1);

    // The rows are gone, so the selector returns nothing on the second run.
    const secondStore = createStore([]);
    const second = await runRetentionCleanup({
      store: secondStore,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(second).toEqual({
      scanned: 0,
      purged: 0,
      skipped_open: 0,
      dryRun: false,
    });
    expect(db.deleteConversationCalls).toBe(1);
    expect(db.transactions).toBe(1);
  });

  it("resolves a missing row exactly like an already-purged one (no throw)", async () => {
    const db = new FakeRetentionPurgeDatabase();
    const store = createStore([CONVERSATION_ID]);

    const run = () =>
      runRetentionCleanup({
        store,
        purgeDatabase: db,
        olderThanDays: 30,
        limit: 10,
        now: NOW,
      });

    await expect(run()).resolves.toEqual({
      scanned: 1,
      purged: 0,
      skipped_open: 1,
      dryRun: false,
    });
    await expect(run()).resolves.toEqual({
      scanned: 1,
      purged: 0,
      skipped_open: 1,
      dryRun: false,
    });
    expect(db.deleteConversationCalls).toBe(0);
  });

  it("propagates a purge failure instead of counting it as purged", async () => {
    const closedAt = new Date(NOW.getTime() - 60 * 86_400_000);
    const db = new FakeRetentionPurgeDatabase([[CONVERSATION_ID, closedAt]]);
    db.failOnSql = "DELETE FROM chat_messages WHERE conversation_id = ?";
    const store = createStore([CONVERSATION_ID]);

    await expect(
      runRetentionCleanup({
        store,
        purgeDatabase: db,
        olderThanDays: 30,
        limit: 10,
        now: NOW,
      })
    ).rejects.toThrow("simulated statement failure");
    expect(db.rollbacks).toBe(1);
    // Rollback restores the claim, so no candidate silently disappears.
    expect(db.liveClosed.has(CONVERSATION_ID)).toBe(true);
  });
});

describe("runRetentionCleanup — concurrency", () => {
  it("lets only one concurrent run claim and delete the same conversation", async () => {
    const closedAt = new Date(NOW.getTime() - 60 * 86_400_000);
    const db = new FakeRetentionPurgeDatabase([[CONVERSATION_ID, closedAt]]);
    const storeA = createStore([CONVERSATION_ID]);
    const storeB = createStore([CONVERSATION_ID]);

    const [reportA, reportB] = await Promise.all([
      runRetentionCleanup({
        store: storeA,
        purgeDatabase: db,
        olderThanDays: 30,
        limit: 10,
        now: NOW,
      }),
      runRetentionCleanup({
        store: storeB,
        purgeDatabase: db,
        olderThanDays: 30,
        limit: 10,
        now: NOW,
      }),
    ]);

    // Exactly one run purges; the loser is reported as skipped, never purged.
    expect(reportA.purged + reportB.purged).toBe(1);
    expect(reportA.skipped_open + reportB.skipped_open).toBe(1);
    expect(db.deleteConversationCalls).toBe(1);
  });
});

describe("runRetentionCleanup — execution log", () => {
  it("emits counts only and never any conversation data", async () => {
    const db = new FakeRetentionPurgeDatabase();
    const store = createStore([]);

    const report = await runRetentionCleanup({
      store,
      purgeDatabase: db,
      olderThanDays: 30,
      limit: 10,
      now: NOW,
    });

    expect(Object.keys(report).sort()).toEqual([
      "dryRun",
      "purged",
      "scanned",
      "skipped_open",
    ]);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("@");
    expect(serialized).not.toContain(CONVERSATION_ID);
    expect(typeof report.scanned).toBe("number");
    expect(typeof report.purged).toBe("number");
    expect(typeof report.skipped_open).toBe("number");
    expect(typeof report.dryRun).toBe("boolean");
  });
});

describe("createRetentionCandidateStore — mysql2 adapter", () => {
  /** Fake pool that records the statement it receives and returns `rows`. */
  function poolReturning(rows: readonly unknown[]) {
    const executed: Array<{ sql: string; params: readonly unknown[] }> = [];
    const execute = vi.fn(
      async (sql: string, params: readonly unknown[]): Promise<[unknown, unknown[]]> => {
        executed.push({ sql, params: [...params] });
        return [[...rows], []];
      }
    );
    return { pool: { execute } as unknown as Pool, execute, executed };
  }

  it("executes the selector with bound parameters and maps ids only", async () => {
    const { pool, execute, executed } = poolReturning([{ id: "a" }, { id: "b" }]);
    const store = createRetentionCandidateStore(pool);
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 30,
      limit: 2,
      now: NOW,
    });

    const ids = await store.listCandidates(selector);

    expect(ids).toEqual(["a", "b"]);
    expect(execute).toHaveBeenCalledWith(selector.sql, [...selector.params]);
    expect(executed[0].sql).not.toContain("chat_contact_consents");
    expect(executed[0].sql).not.toContain("visitor_email");
    expect(executed[0].params).toEqual([...selector.params]);
  });

  it("rejects a malformed row shape instead of leaking it", async () => {
    const { pool } = poolReturning([{ nope: 1 }]);
    const store = createRetentionCandidateStore(pool);
    const selector = buildRetentionCandidateSelector({
      olderThanDays: 30,
      limit: 2,
      now: NOW,
    });

    await expect(store.listCandidates(selector)).rejects.toBeInstanceOf(
      ChatRetentionInputError
    );
  });
});
