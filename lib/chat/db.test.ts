import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

// Capture the createPool spy so we can assert laziness, reuse and reset.
const { createPoolMock } = vi.hoisted(() => ({ createPoolMock: vi.fn() }));
vi.mock("mysql2/promise", () => ({ createPool: createPoolMock }));

import type { Pool, RowDataPacket } from "mysql2/promise";

import {
  ChatDatabaseConfigError,
  type ChatDatabaseConfig,
} from "./database-config";
import {
  buildPoolOptions,
  chatExecute,
  chatQueryRows,
  closeChatPool,
  createChatMigrationDatabase,
  getChatPool,
  probeChatDb,
  resetChatPool,
} from "./db";
import { MIGRATIONS_TABLE } from "./migrations";

type ConnectionListener = (connection: {
  query: (...args: unknown[]) => unknown;
}) => void;

function createFakePool() {
  const listeners = new Map<string, ConnectionListener>();
  const pool = {
    query: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => [[], []]),
    execute: vi.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => [{ affectedRows: 1 }, []]
    ),
    getConnection: vi.fn(),
    end: vi.fn(async () => undefined),
    on: vi.fn((event: string, listener: ConnectionListener) => {
      listeners.set(event, listener);
      return pool;
    }),
    listeners,
  };
  return pool;
}

const VALID_ENV = {
  CHAT_DB_NAME: "chat",
  CHAT_DB_USER: "chat_user",
  CHAT_DB_PASSWORD: "chat_password",
} as const;

function setValidEnv(): void {
  process.env.CHAT_DB_NAME = VALID_ENV.CHAT_DB_NAME;
  process.env.CHAT_DB_USER = VALID_ENV.CHAT_DB_USER;
  process.env.CHAT_DB_PASSWORD = VALID_ENV.CHAT_DB_PASSWORD;
}

beforeEach(async () => {
  await resetChatPool();
  createPoolMock.mockReset();
  createPoolMock.mockImplementation(() => createFakePool());
  setValidEnv();
});

afterEach(async () => {
  await resetChatPool();
  delete process.env.CHAT_DB_NAME;
  delete process.env.CHAT_DB_USER;
  delete process.env.CHAT_DB_PASSWORD;
});

describe("getChatPool — lazy singleton", () => {
  it("does not create a pool until it is first requested", () => {
    expect(createPoolMock).not.toHaveBeenCalled();
  });

  it("creates the pool once and reuses the same instance", () => {
    const first = getChatPool();
    const second = getChatPool();

    expect(first).toBe(second);
    expect(createPoolMock).toHaveBeenCalledTimes(1);
  });

  it("throws a typed configuration error and creates no pool when env is missing", () => {
    delete process.env.CHAT_DB_PASSWORD;

    expect(() => getChatPool()).toThrowError(ChatDatabaseConfigError);
    expect(createPoolMock).not.toHaveBeenCalled();
  });
});

describe("buildPoolOptions", () => {
  const config: ChatDatabaseConfig = {
    host: "127.0.0.1",
    port: 3306,
    database: "chat",
    user: "chat_user",
    password: "chat_password",
    poolLimit: 8,
    connectTimeoutMs: 10_000,
    queryTimeoutMs: 15_000,
  };

  it("binds the fixed host, bounded pool and safe defaults", () => {
    const options = buildPoolOptions(config);

    expect(options).toMatchObject({
      host: "127.0.0.1",
      port: 3306,
      database: "chat",
      user: "chat_user",
      connectionLimit: 8,
      waitForConnections: true,
      connectTimeout: 10_000,
      timezone: "Z",
      charset: "utf8mb4",
    });
  });

  it("never enables multipleStatements", () => {
    expect(buildPoolOptions(config).multipleStatements).toBe(false);
  });
});

describe("createChatPool connection hook", () => {
  it("forces a UTC session on each pooled connection", () => {
    getChatPool();
    const pool = createPoolMock.mock.results[0].value as ReturnType<
      typeof createFakePool
    >;
    const listener = pool.listeners.get("connection");

    expect(listener).toBeTypeOf("function");
    const connection = { query: vi.fn(async () => undefined) };
    listener?.(connection);
    expect(connection.query).toHaveBeenCalledWith("SET time_zone = '+00:00'");
  });
});

describe("pool lifecycle", () => {
  it("closes the pool and recreates it after resetChatPool", async () => {
    const first = getChatPool();

    await resetChatPool();

    expect(first.end).toHaveBeenCalledTimes(1);
    const second = getChatPool();
    expect(second).not.toBe(first);
    expect(createPoolMock).toHaveBeenCalledTimes(2);
  });

  it("closeChatPool performs the same graceful shutdown", async () => {
    const pool = getChatPool();

    await closeChatPool();

    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});

describe("probeChatDb", () => {
  it("returns true when the health query succeeds", async () => {
    const pool = createFakePool();
    createPoolMock.mockReturnValue(pool);

    await expect(probeChatDb()).resolves.toBe(true);
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns false instead of throwing when the health query fails", async () => {
    const pool = createFakePool();
    pool.query.mockRejectedValue(new Error("database is down"));
    createPoolMock.mockReturnValue(pool);

    await expect(probeChatDb()).resolves.toBe(false);
  });
});

describe("parameterized query helpers", () => {
  it("runs parameterized reads with the configured query timeout", async () => {
    const pool = createFakePool();
    pool.query.mockResolvedValue([[{ id: 1 }], []]);
    createPoolMock.mockReturnValue(pool);

    const rows = await chatQueryRows<RowDataPacket & { id: number }>(
      "SELECT id FROM t WHERE id = ?",
      [1]
    );

    expect(rows).toEqual([{ id: 1 }]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: "SELECT id FROM t WHERE id = ?",
        values: [1],
        timeout: 15_000,
      })
    );
  });

  it("binds parameters for writes instead of interpolating them", async () => {
    const pool = createFakePool();
    createPoolMock.mockReturnValue(pool);

    const result = await chatExecute("INSERT INTO t (a) VALUES (?)", ["value"]);

    expect(result).toEqual({ affectedRows: 1 });
    expect(pool.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: "INSERT INTO t (a) VALUES (?)",
        values: ["value"],
        timeout: 15_000,
      })
    );
  });
});

function createMigrationFakePool() {
  const connection = {
    query: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => [[], []]),
    execute: vi.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => [{ affectedRows: 1 }, []]
    ),
    beginTransaction: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => [[], []]),
    getConnection: vi.fn(async () => connection),
  };
  return { pool, connection };
}

describe("createChatMigrationDatabase", () => {
  it("creates the bookkeeping table with a parameterless DDL query", async () => {
    const { pool } = createMigrationFakePool();
    const database = createChatMigrationDatabase(pool as unknown as Pool);

    await database.ensureMigrationsTable();

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(String(pool.query.mock.calls[0][0])).toContain(MIGRATIONS_TABLE);
  });

  it("maps applied migration rows to id/checksum records", async () => {
    const { pool } = createMigrationFakePool();
    pool.query.mockResolvedValue([
      [{ id: "0001_a", checksum: "a".repeat(64) }],
      [],
    ]);
    const database = createChatMigrationDatabase(pool as unknown as Pool);

    await expect(database.getAppliedMigrations()).resolves.toEqual([
      { id: "0001_a", checksum: "a".repeat(64) },
    ]);
  });

  it("applies a migration transactionally and records a bound insert", async () => {
    const { pool, connection } = createMigrationFakePool();
    const database = createChatMigrationDatabase(pool as unknown as Pool);
    const appliedAt = new Date("2026-10-09T00:00:00.000Z");

    await database.applyMigration(
      { id: "0001_a", statements: ["CREATE TABLE a (id INT)", "CREATE INDEX i ON a (id)"] },
      "b".repeat(64),
      appliedAt
    );

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.query).toHaveBeenNthCalledWith(1, "CREATE TABLE a (id INT)");
    expect(connection.query).toHaveBeenNthCalledWith(2, "CREATE INDEX i ON a (id)");
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining(`INSERT INTO ${MIGRATIONS_TABLE}`),
      ["0001_a", "b".repeat(64), appliedAt]
    );
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back, releases and rethrows when a migration statement fails", async () => {
    const { pool, connection } = createMigrationFakePool();
    connection.query.mockRejectedValue(new Error("statement failed"));
    const database = createChatMigrationDatabase(pool as unknown as Pool);

    await expect(
      database.applyMigration(
        { id: "0001_a", statements: ["BROKEN SQL"] },
        "c".repeat(64),
        new Date()
      )
    ).rejects.toThrow("statement failed");

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
