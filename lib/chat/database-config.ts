import "server-only";

/**
 * Server-only, typed configuration factory for the chat MariaDB connection.
 *
 * This module is the single place that reads the `CHAT_DB_*` environment
 * variables, matching the Next.js Data Access Layer guidance: secrets and
 * `process.env` stay inside a `server-only` module so no client component can
 * ever import the database connection.
 *
 * Design rules:
 * - The host is fixed to the IPv4 loopback `127.0.0.1`. Hostinger denies the
 *   IPv6 loopback (`localhost`), so any other value is a hard error instead of
 *   a silent fallback.
 * - `CHAT_DB_NAME`, `CHAT_DB_USER` and `CHAT_DB_PASSWORD` are required to build
 *   a real connection. Missing values throw; they never default to something
 *   insecure.
 * - Numeric settings are parsed defensively: invalid input falls back to the
 *   documented default, and the pool size is clamped to the Hostinger-safe
 *   bound of 1..10.
 * - Error messages name the offending variable but never include a credential
 *   or a connection string.
 */

/** Fixed IPv4 loopback. `localhost` resolves to IPv6 and is denied by Hostinger. */
export const CHAT_DB_HOST = "127.0.0.1" as const;

export const CHAT_DB_DEFAULT_PORT = 3306;
export const CHAT_DB_PORT_MIN = 1;
export const CHAT_DB_PORT_MAX = 65_535;

export const CHAT_DB_DEFAULT_POOL_SIZE = 8;
export const CHAT_DB_MIN_POOL_SIZE = 1;
export const CHAT_DB_MAX_POOL_SIZE = 10;

export const CHAT_DB_DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
export const CHAT_DB_DEFAULT_QUERY_TIMEOUT_MS = 15_000;
export const CHAT_DB_TIMEOUT_MIN_MS = 1;
export const CHAT_DB_TIMEOUT_MAX_MS = 120_000;

export type ChatDatabaseEnv = {
  readonly CHAT_DB_HOST?: string;
  readonly CHAT_DB_PORT?: string;
  readonly CHAT_DB_NAME?: string;
  readonly CHAT_DB_USER?: string;
  readonly CHAT_DB_PASSWORD?: string;
  readonly CHAT_DB_POOL_SIZE?: string;
  readonly CHAT_DB_CONNECT_TIMEOUT_MS?: string;
  readonly CHAT_DB_QUERY_TIMEOUT_MS?: string;
  /**
   * Index signature so `process.env` (a `Record<string, string | undefined>`)
   * can be passed directly without tripping the weak-type check.
   */
  readonly [key: string]: string | undefined;
};

export type ChatDatabaseConfig = {
  /** Always the IPv4 loopback literal. */
  readonly host: typeof CHAT_DB_HOST;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  /** Connection pool size, clamped to 1..10. */
  readonly poolLimit: number;
  readonly connectTimeoutMs: number;
  readonly queryTimeoutMs: number;
};

export class ChatDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatDatabaseConfigError";
  }
}

type BoundedIntOptions = {
  readonly fallback: number;
  readonly min: number;
  readonly max: number;
};

/**
 * Parses an integer environment value defensively.
 *
 * Empty, non-numeric or fractional input falls back to the default; out-of-range
 * values are clamped to the safe bound. This never throws and never returns NaN.
 */
function parseBoundedInt(raw: string | undefined, options: BoundedIntOptions): number {
  if (raw === undefined || raw.trim() === "") {
    return options.fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return options.fallback;
  }
  return Math.min(options.max, Math.max(options.min, parsed));
}

function requireValue(key: string, raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    throw new ChatDatabaseConfigError(
      `Missing required environment variable ${key}.`
    );
  }
  return raw;
}

/**
 * Parses the TCP port. An out-of-range or non-integer value falls back to the
 * default port instead of being clamped, so a typo never silently connects to a
 * different, valid-looking port.
 */
function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return CHAT_DB_DEFAULT_PORT;
  }
  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed < CHAT_DB_PORT_MIN ||
    parsed > CHAT_DB_PORT_MAX
  ) {
    return CHAT_DB_DEFAULT_PORT;
  }
  return parsed;
}

function resolveHost(raw: string | undefined): typeof CHAT_DB_HOST {
  if (raw === undefined || raw.trim() === "") {
    return CHAT_DB_HOST;
  }
  if (raw.trim() !== CHAT_DB_HOST) {
    throw new ChatDatabaseConfigError(
      `CHAT_DB_HOST must be ${CHAT_DB_HOST}; received a different value. ` +
        `The chat database never connects through localhost or a remote host.`
    );
  }
  return CHAT_DB_HOST;
}

/**
 * Builds a frozen, fully typed database configuration from an environment map.
 * Pure and side-effect free so it can be exercised directly in tests.
 */
export function createChatDatabaseConfig(env: ChatDatabaseEnv): ChatDatabaseConfig {
  return Object.freeze({
    host: resolveHost(env.CHAT_DB_HOST),
    port: parsePort(env.CHAT_DB_PORT),
    database: requireValue("CHAT_DB_NAME", env.CHAT_DB_NAME),
    user: requireValue("CHAT_DB_USER", env.CHAT_DB_USER),
    password: requireValue("CHAT_DB_PASSWORD", env.CHAT_DB_PASSWORD),
    poolLimit: parseBoundedInt(env.CHAT_DB_POOL_SIZE, {
      fallback: CHAT_DB_DEFAULT_POOL_SIZE,
      min: CHAT_DB_MIN_POOL_SIZE,
      max: CHAT_DB_MAX_POOL_SIZE,
    }),
    connectTimeoutMs: parseBoundedInt(env.CHAT_DB_CONNECT_TIMEOUT_MS, {
      fallback: CHAT_DB_DEFAULT_CONNECT_TIMEOUT_MS,
      min: CHAT_DB_TIMEOUT_MIN_MS,
      max: CHAT_DB_TIMEOUT_MAX_MS,
    }),
    queryTimeoutMs: parseBoundedInt(env.CHAT_DB_QUERY_TIMEOUT_MS, {
      fallback: CHAT_DB_DEFAULT_QUERY_TIMEOUT_MS,
      min: CHAT_DB_TIMEOUT_MIN_MS,
      max: CHAT_DB_TIMEOUT_MAX_MS,
    }),
  });
}
