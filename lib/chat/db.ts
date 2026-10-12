import "server-only";

import {
  createPool,
  type Pool,
  type PoolOptions,
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";

import {
  createChatDatabaseConfig,
  type ChatDatabaseConfig,
} from "./database-config";
import {
  MIGRATIONS_TABLE,
  MIGRATIONS_TABLE_DDL,
  type AppliedMigration,
  type ChatMigration,
  type MigrationRunnerDatabase,
} from "./migrations";

/**
 * Server-only MariaDB access layer for the chat module.
 *
 * This is the chat Data Access Layer: it owns the single process-wide mysql2
 * pool and never exposes the connection to client code (enforced by the
 * `server-only` import). Requirements honored here:
 * - One lazy singleton pool; never a connection per request.
 * - UTC session and literal host `127.0.0.1` from the typed config factory.
 * - Bounded connection and per-query timeouts.
 * - `multipleStatements` stays disabled; every value is passed as a bound
 *   parameter, never interpolated into SQL.
 * - Credentials are never logged, echoed in errors, or returned to callers.
 */

/** Scalar values accepted as bound query parameters. */
export type ChatQueryParam =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Buffer
  | Uint8Array;

const UTC_SESSION_STATEMENT = "SET time_zone = '+00:00'";

/**
 * Builds mysql2 pool options from a validated config. Exposed for testing.
 */
export function buildPoolOptions(config: ChatDatabaseConfig): PoolOptions {
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.poolLimit,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: config.connectTimeoutMs,
    multipleStatements: false,
    timezone: "Z",
    charset: "utf8mb4",
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
  };
}

/**
 * Creates a new pool. Prefer {@link getChatPool}; this is exported so tests can
 * exercise the connection hook directly.
 */
export function createChatPool(config: ChatDatabaseConfig): Pool {
  const pool = createPool(buildPoolOptions(config));

  // Every new pooled connection starts in UTC. mysql2 queues this before any
  // user command on that connection, so it always runs first.
  pool.on("connection", (connection) => {
    void connection.query(UTC_SESSION_STATEMENT);
  });

  return pool;
}

type ChatPoolState = {
  readonly pool: Pool;
  readonly config: ChatDatabaseConfig;
};

let state: ChatPoolState | null = null;

function getChatPoolState(): ChatPoolState {
  if (state === null) {
    const config = createChatDatabaseConfig(process.env);
    state = { pool: createChatPool(config), config };
  }
  return state;
}

/** Returns the lazy singleton pool, creating it on first use. */
export function getChatPool(): Pool {
  return getChatPoolState().pool;
}

/** Gracefully closes the pool. Safe to call when no pool exists. */
export async function closeChatPool(): Promise<void> {
  const current = state;
  state = null;
  if (current !== null) {
    await current.pool.end();
  }
}

/** Alias of {@link closeChatPool} used by tests to reset the singleton. */
export async function resetChatPool(): Promise<void> {
  await closeChatPool();
}

/**
 * Runs a parameterized read and returns typed rows. Values are always bound.
 */
export async function chatQueryRows<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: readonly ChatQueryParam[] = []
): Promise<T[]> {
  const { pool, config } = getChatPoolState();
  const [rows] = await pool.query<RowDataPacket[]>({
    sql,
    values: [...params],
    timeout: config.queryTimeoutMs,
  });
  return rows as T[];
}

/**
 * Runs a parameterized write through a prepared statement. Values are bound,
 * never interpolated, so caller input can never alter the statement structure.
 */
export async function chatExecute(
  sql: string,
  params: readonly ChatQueryParam[] = []
): Promise<ResultSetHeader> {
  const { pool, config } = getChatPoolState();
  const [result] = await pool.execute<ResultSetHeader>({
    sql,
    values: [...params],
    timeout: config.queryTimeoutMs,
  });
  return result;
}

/**
 * Cheap liveness probe for operational health checks. Returns a boolean and
 * never throws, so a caller can report status without leaking a driver error.
 */
export async function probeChatDb(): Promise<boolean> {
  try {
    await getChatPoolState().pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Adapts a mysql2 pool to the migration runner's {@link MigrationRunnerDatabase}
 * surface. Each migration runs on a dedicated connection inside a transaction;
 * a failure rolls back and the connection is always released.
 */
export function createChatMigrationDatabase(pool: Pool): MigrationRunnerDatabase {
  return {
    async ensureMigrationsTable(): Promise<void> {
      await pool.query(MIGRATIONS_TABLE_DDL);
    },

    async getAppliedMigrations(): Promise<readonly AppliedMigration[]> {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, checksum FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`
      );
      return rows.map((row) => ({
        id: String(row.id),
        checksum: String(row.checksum),
      }));
    },

    async applyMigration(
      migration: ChatMigration,
      checksum: string,
      appliedAt: Date
    ): Promise<void> {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        for (const statement of migration.statements) {
          await connection.query(statement);
        }
        await connection.execute(
          `INSERT INTO ${MIGRATIONS_TABLE} (id, checksum, applied_at) VALUES (?, ?, ?)`,
          [migration.id, checksum, appliedAt]
        );
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}
