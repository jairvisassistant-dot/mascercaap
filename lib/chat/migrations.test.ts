import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type AppliedMigration,
  type ChatMigration,
  MigrationChecksumMismatchError,
  type MigrationRunnerDatabase,
  MigrationValidationError,
  computeMigrationChecksum,
  loadSqlDirectoryMigrations,
  runMigrations,
  splitSqlStatements,
  validateMigrations,
} from "./migrations";

// ── In-memory fake so ordering/checksum/idempotency/drift logic can be
// ── exercised without a MariaDB instance.

class FakeMigrationDatabase implements MigrationRunnerDatabase {
  migrationsTableEnsured = false;
  applied: AppliedMigration[] = [];
  appliedCalls: Array<{ id: string; checksum: string; appliedAt: Date }> = [];
  failOn: string | null = null;

  async ensureMigrationsTable(): Promise<void> {
    this.migrationsTableEnsured = true;
  }

  async getAppliedMigrations(): Promise<readonly AppliedMigration[]> {
    return [...this.applied].sort((a, b) => a.id.localeCompare(b.id));
  }

  async applyMigration(
    migration: ChatMigration,
    checksum: string,
    appliedAt: Date
  ): Promise<void> {
    if (this.failOn === migration.id) {
      throw new Error(`simulated failure for ${migration.id}`);
    }
    this.appliedCalls.push({ id: migration.id, checksum, appliedAt });
    this.applied.push({ id: migration.id, checksum });
  }
}

const M1: ChatMigration = {
  id: "0001_create_conversations",
  statements: ["CREATE TABLE chat_conversations (id BIGINT PRIMARY KEY)"],
};
const M2: ChatMigration = {
  id: "0002_create_messages",
  statements: ["CREATE TABLE chat_messages (id BIGINT PRIMARY KEY)"],
};

describe("computeMigrationChecksum", () => {
  it("is deterministic for identical migrations", () => {
    expect(computeMigrationChecksum(M1)).toBe(computeMigrationChecksum({ ...M1 }));
  });

  it("produces a 64-character lowercase hex SHA-256 digest", () => {
    expect(computeMigrationChecksum(M1)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when a statement changes", () => {
    const changed: ChatMigration = {
      ...M1,
      statements: ["CREATE TABLE chat_conversations (id BIGINT PRIMARY KEY, x INT)"],
    };

    expect(computeMigrationChecksum(changed)).not.toBe(
      computeMigrationChecksum(M1)
    );
  });

  it("is insensitive to CRLF line endings and statement edge whitespace", () => {
    const a: ChatMigration = { id: "x", statements: ["SELECT 1;\r\nSELECT 2"] };
    const b: ChatMigration = { id: "x", statements: ["SELECT 1;\nSELECT 2"] };

    expect(computeMigrationChecksum(a)).toBe(computeMigrationChecksum(b));
  });
});

describe("validateMigrations", () => {
  it("accepts a uniquely named, ascending list", () => {
    expect(() => validateMigrations([M1, M2])).not.toThrow();
  });

  it("accepts an empty list", () => {
    expect(() => validateMigrations([])).not.toThrow();
  });

  it("rejects duplicate ids", () => {
    expect(() => validateMigrations([M1, { ...M2, id: M1.id }])).toThrowError(
      MigrationValidationError
    );
  });

  it("rejects ids that are not in ascending order", () => {
    expect(() => validateMigrations([M2, M1])).toThrowError(
      MigrationValidationError
    );
  });

  it("rejects an empty id", () => {
    expect(() => validateMigrations([{ id: "  ", statements: [] }])).toThrowError(
      MigrationValidationError
    );
  });
});

describe("runMigrations", () => {
  it("ensures the bookkeeping table and applies pending migrations in order", async () => {
    const db = new FakeMigrationDatabase();

    const result = await runMigrations(db, [M1, M2]);

    expect(db.migrationsTableEnsured).toBe(true);
    expect(db.appliedCalls.map((call) => call.id)).toEqual([M1.id, M2.id]);
    expect(result).toEqual({ applied: [M1.id, M2.id], skipped: [] });
  });

  it("records the computed checksum and a timestamp for each migration", async () => {
    const db = new FakeMigrationDatabase();
    const now = new Date("2026-10-09T12:00:00.000Z");

    await runMigrations(db, [M1], { now: () => now });

    expect(db.appliedCalls[0].checksum).toBe(computeMigrationChecksum(M1));
    expect(db.appliedCalls[0].appliedAt).toBe(now);
  });

  it("is idempotent: a second run skips already applied migrations", async () => {
    const db = new FakeMigrationDatabase();

    const first = await runMigrations(db, [M1, M2]);
    const second = await runMigrations(db, [M1, M2]);

    expect(first.applied).toEqual([M1.id, M2.id]);
    expect(second).toEqual({ applied: [], skipped: [M1.id, M2.id] });
    expect(db.appliedCalls).toHaveLength(2);
  });

  it("applies only the migrations that are not yet recorded", async () => {
    const db = new FakeMigrationDatabase();
    await runMigrations(db, [M1]);

    const result = await runMigrations(db, [M1, M2]);

    expect(result).toEqual({ applied: [M2.id], skipped: [M1.id] });
  });

  it("detects checksum drift and refuses to run", async () => {
    const db = new FakeMigrationDatabase();
    db.applied.push({ id: M1.id, checksum: "0".repeat(64) });

    await expect(runMigrations(db, [M1, M2])).rejects.toBeInstanceOf(
      MigrationChecksumMismatchError
    );
    expect(db.appliedCalls).toHaveLength(0);
  });

  it("ignores applied migrations that are absent from the provided list (forward-only)", async () => {
    const db = new FakeMigrationDatabase();
    db.applied.push({ id: "0000_legacy", checksum: "a".repeat(64) });

    const result = await runMigrations(db, [M1]);

    expect(result).toEqual({ applied: [M1.id], skipped: [] });
  });

  it("validates the migration list before touching the database", async () => {
    const db = new FakeMigrationDatabase();

    await expect(runMigrations(db, [M2, M1])).rejects.toBeInstanceOf(
      MigrationValidationError
    );
    expect(db.migrationsTableEnsured).toBe(false);
  });
});

describe("splitSqlStatements", () => {
  it("splits on top-level semicolons and drops empty statements", () => {
    expect(splitSqlStatements("SELECT 1; SELECT 2;\n")).toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
  });

  it("keeps a trailing statement without a semicolon", () => {
    expect(splitSqlStatements("SELECT 1;\nSELECT 2")).toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
  });

  it("ignores semicolons inside string literals", () => {
    expect(splitSqlStatements("INSERT INTO t VALUES ('a;b'); SELECT 1")).toEqual([
      "INSERT INTO t VALUES ('a;b')",
      "SELECT 1",
    ]);
  });

  it("ignores semicolons inside quoted identifiers and handles doubled quotes", () => {
    expect(
      splitSqlStatements("SELECT `a;b`, 'it''s;fine' FROM t; SELECT 2")
    ).toEqual(["SELECT `a;b`, 'it''s;fine' FROM t", "SELECT 2"]);
  });

  it("ignores semicolons inside line and block comments", () => {
    const sql = [
      "-- a; comment",
      "SELECT 1; /* block; comment */",
      "SELECT 2",
    ].join("\n");

    expect(splitSqlStatements(sql)).toEqual(["SELECT 1", "SELECT 2"]);
  });
});

describe("loadSqlDirectoryMigrations", () => {
  const files: Record<string, string> = {
    "/migrations/0002_b.sql": "CREATE TABLE b (id INT)",
    "/migrations/0001_a.sql": "CREATE TABLE a (id INT); CREATE INDEX i ON a (id)",
    "/migrations/README.md": "ignored",
  };

  const deps = {
    readDirectory: async () => ["0002_b.sql", "0001_a.sql", "README.md"],
    readFile: async (path: string) => files[path],
  };

  it("loads .sql files sorted by name and splits their statements", async () => {
    const migrations = await loadSqlDirectoryMigrations("/migrations", deps);

    expect(migrations.map((m) => m.id)).toEqual(["0001_a", "0002_b"]);
    expect(migrations[0].statements).toEqual([
      "CREATE TABLE a (id INT)",
      "CREATE INDEX i ON a (id)",
    ]);
  });

  it("returns an empty list when the directory does not exist yet", async () => {
    const missing = {
      readDirectory: async () => {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      },
      readFile: deps.readFile,
    };

    await expect(
      loadSqlDirectoryMigrations("/missing", missing)
    ).resolves.toEqual([]);
  });
});

// ── Static schema assertions for the real authored core migration. ──
// These tests read `lib/chat/migrations/001_chat_core.sql` through the real
// splitter, so they also prove the migration only uses SQL the current splitter
// supports. They assert structure (tables, cascades, indexes, forbidden syntax)
// — they deliberately do NOT claim a live MariaDB migration was executed.

const CORE_MIGRATION_ID = "001_chat_core";
const CORE_MIGRATIONS_DIRECTORY = fileURLToPath(
  new URL("./migrations", import.meta.url)
);

const REQUIRED_TABLES = [
  "chat_conversations",
  "chat_messages",
  "visitor_chat_sessions",
  "chat_resume_tokens",
  "operator_conversation_reads",
  "operator_push_subscriptions",
  "rate_limit_entries",
  "chat_email_outbox",
  "chat_contact_consents",
  "chat_metrics_events",
  "chat_metrics_daily",
] as const;

/** Tables whose rows are scoped to one conversation and must cascade on purge. */
const CONVERSATION_BOUND_TABLES = [
  "chat_messages",
  "visitor_chat_sessions",
  "chat_resume_tokens",
  "operator_conversation_reads",
  "chat_email_outbox",
  "chat_metrics_events",
] as const;

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Maps each `CREATE TABLE` statement to its table name. */
function parseTableStatements(
  statements: readonly string[]
): Map<string, string> {
  const tables = new Map<string, string>();
  for (const statement of statements) {
    const match = /^create\s+table\s+(?:if\s+not\s+exists\s+)?`?([a-z0-9_]+)`?/i.exec(
      statement.trim()
    );
    if (match) {
      tables.set(match[1].toLowerCase(), statement);
    }
  }
  return tables;
}

describe("001_chat_core migration — static schema", () => {
  let statements: readonly string[] = [];
  let tables = new Map<string, string>();

  beforeAll(async () => {
    const migrations = await loadSqlDirectoryMigrations(
      CORE_MIGRATIONS_DIRECTORY
    );
    expect(() => validateMigrations(migrations)).not.toThrow();

    const core = migrations.find((migration) => migration.id === CORE_MIGRATION_ID);
    if (core === undefined) {
      throw new Error(`Expected migration ${CORE_MIGRATION_ID} to exist.`);
    }
    statements = core.statements;
    tables = parseTableStatements(statements);
  });

  function table(name: string): string {
    const statement = tables.get(name);
    if (statement === undefined) {
      throw new Error(`Expected table ${name} in the core migration.`);
    }
    return statement;
  }

  it("parses into only splitter-supported DDL statements and declares every required table", () => {
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement).toMatch(/^create table/i);
    }
    for (const name of REQUIRED_TABLES) {
      expect(tables.has(name), `missing table ${name}`).toBe(true);
    }
    expect(tables.size).toBe(REQUIRED_TABLES.length);
  });

  it("uses InnoDB, utf8mb4 and DATETIME(6) timestamps on every table", () => {
    for (const name of REQUIRED_TABLES) {
      const sql = normalizeSql(table(name));
      expect(sql, `${name} must be InnoDB`).toContain("engine=innodb");
      expect(sql, `${name} must be utf8mb4`).toContain(
        "default charset=utf8mb4"
      );
      expect(sql, `${name} must use DATETIME(6)`).toContain("datetime(6)");
    }
  });

  it("stores explicit internal UUID primary keys with no auto-increment or public ids", () => {
    for (const name of [
      "chat_conversations",
      "chat_messages",
      "chat_contact_consents",
    ]) {
      const sql = normalizeSql(table(name));
      expect(sql, `${name} must use a CHAR(36) uuid id`).toContain("id char(36)");
      expect(sql, `${name} must not auto-increment`).not.toContain(
        "auto_increment"
      );
    }
    expect(normalizeSql(statements.join(" ; "))).not.toContain("short_id");
  });

  it("cascades every conversation-bound table from chat_conversations", () => {
    for (const name of CONVERSATION_BOUND_TABLES) {
      const sql = normalizeSql(table(name));
      expect(sql, `${name} must reference chat_conversations`).toContain(
        "references chat_conversations (id)"
      );
      expect(sql, `${name} must cascade deletes`).toContain(
        "on delete cascade"
      );
    }
  });

  it("declares the criteria-required composite and unique indexes", () => {
    expect(normalizeSql(table("chat_messages"))).toContain(
      "key chat_messages_pagination_idx (conversation_id, created_at, id)"
    );
    expect(normalizeSql(table("chat_messages"))).toContain(
      "unique key chat_messages_client_message_uidx (conversation_id, client_message_id)"
    );
    expect(normalizeSql(table("chat_conversations"))).toContain(
      "key chat_conversations_inbox_idx (status, last_message_at, id)"
    );
    expect(normalizeSql(table("chat_conversations"))).toContain(
      "key chat_conversations_cleanup_idx (status, closed_at)"
    );
    expect(normalizeSql(table("visitor_chat_sessions"))).toContain(
      "unique key visitor_chat_sessions_hash_uidx (session_hash)"
    );
    expect(normalizeSql(table("chat_resume_tokens"))).toContain(
      "unique key chat_resume_tokens_hash_uidx (token_hash)"
    );
  });

  it("declares unique rate-limit, outbox idempotency and contact keys", () => {
    expect(normalizeSql(table("rate_limit_entries"))).toContain(
      "unique key rate_limit_entries_window_uidx (key_hash, action, window_start)"
    );
    expect(normalizeSql(table("chat_email_outbox"))).toContain(
      "unique key chat_email_outbox_idempotency_uidx (idempotency_key)"
    );
    expect(normalizeSql(table("operator_push_subscriptions"))).toContain(
      "unique key operator_push_subscriptions_endpoint_uidx (endpoint)"
    );
    expect(normalizeSql(table("chat_contact_consents"))).toContain(
      "unique key chat_contact_consents_contact_uidx (contact_channel, contact_value)"
    );
  });

  it("stores only hashes for sessions and resume tokens, never clear-text secrets", () => {
    const sessions = normalizeSql(table("visitor_chat_sessions"));
    const tokens = normalizeSql(table("chat_resume_tokens"));
    expect(sessions).toContain("session_hash char(64)");
    expect(tokens).toContain("token_hash char(64)");
    expect(sessions).not.toContain("secret");
    expect(tokens).not.toContain("token_value");
  });

  it("keeps commercial consent independent from retained chat history", () => {
    const consent = normalizeSql(table("chat_contact_consents"));
    expect(consent).not.toContain("foreign key");
    expect(consent).not.toContain("references chat_conversations");
    expect(consent).toContain("consent_state");
    expect(consent).toContain("revoked_at");
  });

  it("stores no message body or visitor PII in the metrics structures", () => {
    for (const name of ["chat_metrics_events", "chat_metrics_daily"]) {
      const sql = normalizeSql(table(name));
      expect(sql).not.toMatch(/\bbody\b/);
      expect(sql).not.toMatch(/\bvisitor_email\b/);
      expect(sql).not.toMatch(/\bvisitor_phone\b/);
      expect(sql).not.toMatch(/\bvisitor_name\b/);
      expect(sql).not.toMatch(/\bendpoint\b/);
    }
  });

  it("avoids partial indexes, stored procedures and CHECK constraints", () => {
    for (const statement of statements) {
      expect(statement, "no partial index").not.toMatch(/\bwhere\b/i);
      expect(statement, "no stored procedure").not.toMatch(/\bprocedure\b/i);
      expect(statement, "no delimiter").not.toMatch(/\bdelimiter\b/i);
      expect(statement, "no CHECK constraint").not.toMatch(/\bcheck\s*\(/i);
    }
  });

  it("does not create campaign or marketing-delivery tables", () => {
    const joined = normalizeSql(statements.join(" ; "));
    expect(joined).not.toContain("campaign");
    expect(joined).not.toContain("marketing_send");
  });
});
