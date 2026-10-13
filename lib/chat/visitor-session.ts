import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import type { Pool, RowDataPacket } from "mysql2/promise";

/**
 * Server-only visitor chat session helpers.
 *
 * The browser only ever holds a single opaque, HMAC-signed cookie. The server
 * stores just the SHA-256 hash of the random 256-bit secret, scoped to exactly
 * one conversation. No conversation id, no role and no identity ever travels in
 * the cookie.
 *
 * Security properties:
 * - 256 bits of `randomBytes` entropy; the clear-text secret is never persisted.
 * - `HttpOnly`, `Secure`, explicit `SameSite=Lax`, `Path=/`, bounded TTL.
 * - The cookie value is `v1.<secret>.<hmac>`; the HMAC key can be rotated by
 *   listing comma-separated secrets (`CHAT_SESSION_SECRET`), where the first is
 *   active for signing and every key is accepted for verification.
 * - Tampered, unknown-key, malformed and wrong-version cookies all resolve to
 *   `null`; the helpers never throw on attacker-controlled input and never echo
 *   a secret in an error or log.
 * - Authorization is server-derived: the conversation scope comes from the
 *   database row, never from the cookie. A database failure fails closed.
 */

/** HttpOnly cookie name held by the visitor browser. */
export const CHAT_VISITOR_SESSION_COOKIE_NAME = "chat_visitor_session";

export const CHAT_SESSION_DEFAULT_TTL_SECONDS = 2_592_000; // 30 days
export const CHAT_SESSION_TTL_MIN_SECONDS = 300;
export const CHAT_SESSION_TTL_MAX_SECONDS = 31_536_000; // 1 year

/** Minimum accepted length for a signing secret; shorter keys are weak. */
export const CHAT_SESSION_SECRET_MIN_LENGTH = 32;

const COOKIE_VERSION = "v1";
const SESSION_SECRET_BYTES = 32;

/** Upper bound on an accepted cookie value; keeps hostile headers cheap to reject. */
export const CHAT_VISITOR_SESSION_COOKIE_MAX_LENGTH = 512;

export class ChatSessionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatSessionConfigError";
  }
}

/** Ordered signing keys: `active` signs, every entry verifies (rotation). */
export type VisitorSessionSigningKeys = {
  readonly active: string;
  readonly all: readonly string[];
};

/** Generates a fresh 256-bit opaque session secret (base64url, no padding). */
export function generateVisitorSessionSecret(): string {
  return randomBytes(SESSION_SECRET_BYTES).toString("base64url");
}

/** SHA-256 hex digest stored in `visitor_chat_sessions.session_hash` (CHAR(64)). */
export function hashVisitorSessionSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/**
 * Parses `CHAT_SESSION_SECRET` into an ordered key ring. Comma-separated values
 * enable rotation: the first key signs new cookies, all keys verify old ones.
 * Throws a value-free {@link ChatSessionConfigError} on missing/weak input.
 */
export function parseVisitorSessionSigningKeys(
  raw: string | undefined
): VisitorSessionSigningKeys {
  if (raw === undefined || raw.trim() === "") {
    throw new ChatSessionConfigError(
      "CHAT_SESSION_SECRET is required to sign visitor chat sessions."
    );
  }

  const seen = new Set<string>();
  const all: string[] = [];
  for (const part of raw.split(",")) {
    const key = part.trim();
    if (key === "" || seen.has(key)) continue;
    if (key.length < CHAT_SESSION_SECRET_MIN_LENGTH) {
      throw new ChatSessionConfigError(
        `CHAT_SESSION_SECRET entries must be at least ${CHAT_SESSION_SECRET_MIN_LENGTH} characters.`
      );
    }
    seen.add(key);
    all.push(key);
  }

  if (all.length === 0) {
    throw new ChatSessionConfigError(
      "CHAT_SESSION_SECRET is required to sign visitor chat sessions."
    );
  }

  return Object.freeze({ active: all[0], all: Object.freeze(all) });
}

function signSecret(secret: string, key: string): string {
  return createHmac("sha256", key).update(secret, "utf8").digest("base64url");
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Builds the signed `v1.<secret>.<hmac>` cookie value. */
export function buildVisitorSessionCookieValue(
  secret: string,
  signingKeys: VisitorSessionSigningKeys
): string {
  const signature = signSecret(secret, signingKeys.active);
  return `${COOKIE_VERSION}.${secret}.${signature}`;
}

/**
 * Verifies and extracts the session secret from a cookie value. Returns `null`
 * for any malformed, tampered, unknown-key or wrong-version value; never throws.
 */
export function readVisitorSessionSecret(
  cookieValue: string | null | undefined,
  signingKeys: VisitorSessionSigningKeys
): string | null {
  if (typeof cookieValue !== "string") return null;
  if (
    cookieValue.length === 0 ||
    cookieValue.length > CHAT_VISITOR_SESSION_COOKIE_MAX_LENGTH
  ) {
    return null;
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [version, secret, signature] = parts;
  if (version !== COOKIE_VERSION) return null;
  if (secret === "" || signature === "") return null;

  for (const key of signingKeys.all) {
    if (constantTimeEquals(signature, signSecret(secret, key))) {
      return secret;
    }
  }
  return null;
}

type BoundedIntOptions = {
  readonly fallback: number;
  readonly min: number;
  readonly max: number;
};

function parseBoundedInt(raw: string | undefined, options: BoundedIntOptions): number {
  if (raw === undefined || raw.trim() === "") return options.fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return options.fallback;
  return Math.min(options.max, Math.max(options.min, parsed));
}

/** Resolves the session TTL from `CHAT_SESSION_TTL_SECONDS`, clamped and safe. */
export function resolveVisitorSessionTtl(env: {
  readonly [key: string]: string | undefined;
}): number {
  return parseBoundedInt(env.CHAT_SESSION_TTL_SECONDS, {
    fallback: CHAT_SESSION_DEFAULT_TTL_SECONDS,
    min: CHAT_SESSION_TTL_MIN_SECONDS,
    max: CHAT_SESSION_TTL_MAX_SECONDS,
  });
}

/** Cookie attributes applied to the outgoing `Set-Cookie`. */
export type VisitorSessionCookieOptions = {
  readonly name: string;
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: "lax";
  readonly path: "/";
  readonly maxAge: number;
};

/** Production-safe cookie attributes; `secure` is relaxed only for local http tests. */
export function visitorSessionCookieOptions(input: {
  readonly ttlSeconds: number;
  readonly secure: boolean;
}): VisitorSessionCookieOptions {
  return {
    name: CHAT_VISITOR_SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: input.secure,
    sameSite: "lax",
    path: "/",
    maxAge: input.ttlSeconds,
  };
}

/** Insert fields shared by a session row (no clear-text secret, no conversation). */
export type VisitorSessionFields = {
  readonly id: string;
  readonly sessionHash: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
};

/** A session row scoped to exactly one conversation. */
export type NewVisitorSession = VisitorSessionFields & {
  readonly conversationId: string;
};

/** A persisted session row. */
export type VisitorSessionRecord = NewVisitorSession & {
  readonly revokedAt: Date | null;
};

/** Server-only result of minting a session: secret + the row to persist. */
export type VisitorSessionMaterial = VisitorSessionFields & {
  readonly secret: string;
};

/**
 * Creates the random secret, its hash and the timestamps for a new session.
 * `sessionId`/`secret` are injectable so tests can be deterministic.
 */
export function createVisitorSessionMaterial(input: {
  readonly now: Date;
  readonly ttlSeconds: number;
  readonly sessionId?: string;
  readonly secret?: string;
}): VisitorSessionMaterial {
  const secret = input.secret ?? generateVisitorSessionSecret();
  return {
    id: input.sessionId ?? randomUUID(),
    secret,
    sessionHash: hashVisitorSessionSecret(secret),
    createdAt: input.now,
    lastSeenAt: input.now,
    expiresAt: new Date(input.now.getTime() + input.ttlSeconds * 1000),
  };
}

/** Binds minted session material to one conversation, dropping the clear secret. */
export function toNewVisitorSession(
  material: VisitorSessionMaterial,
  conversationId: string
): NewVisitorSession {
  return {
    id: material.id,
    conversationId,
    sessionHash: material.sessionHash,
    createdAt: material.createdAt,
    lastSeenAt: material.lastSeenAt,
    expiresAt: material.expiresAt,
  };
}

/** Server-only session scope returned after a successful cookie verification. */
export type ResolvedVisitorSession = {
  readonly sessionId: string;
  readonly conversationId: string;
};

/** Port implemented by {@link createVisitorSessionStore}; mockable in tests. */
export interface VisitorSessionStore {
  findActiveByHash(
    sessionHash: string,
    now: Date
  ): Promise<VisitorSessionRecord | null>;
  insert(record: NewVisitorSession): Promise<void>;
  touch(sessionId: string, lastSeenAt: Date): Promise<void>;
  revokeByHash(sessionHash: string, revokedAt: Date): Promise<void>;
  revokeAllForConversation(conversationId: string, revokedAt: Date): Promise<void>;
}

const FIND_ACTIVE_SESSION_SQL =
  "SELECT id, conversation_id, session_hash, created_at, last_seen_at, expires_at, revoked_at " +
  "FROM visitor_chat_sessions " +
  "WHERE session_hash = ? AND revoked_at IS NULL AND expires_at > ? LIMIT 1";

const INSERT_SESSION_SQL =
  "INSERT INTO visitor_chat_sessions " +
  "(id, conversation_id, session_hash, created_at, last_seen_at, expires_at) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

const TOUCH_SESSION_SQL =
  "UPDATE visitor_chat_sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL";

const REVOKE_SESSION_BY_HASH_SQL =
  "UPDATE visitor_chat_sessions SET revoked_at = ? WHERE session_hash = ? AND revoked_at IS NULL";

const REVOKE_SESSIONS_FOR_CONVERSATION_SQL =
  "UPDATE visitor_chat_sessions SET revoked_at = ? WHERE conversation_id = ? AND revoked_at IS NULL";

type SessionRow = RowDataPacket & {
  id: string;
  conversation_id: string;
  session_hash: string;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
};

/** Adapts a mysql2 pool to the {@link VisitorSessionStore} port (parameterized only). */
export function createVisitorSessionStore(pool: Pool): VisitorSessionStore {
  return {
    async findActiveByHash(sessionHash, now) {
      const [rows] = await pool.query<SessionRow[]>(FIND_ACTIVE_SESSION_SQL, [
        sessionHash,
        now,
      ]);
      const row = rows[0];
      if (!row) return null;
      return {
        id: String(row.id),
        conversationId: String(row.conversation_id),
        sessionHash: String(row.session_hash),
        createdAt: new Date(row.created_at),
        lastSeenAt: new Date(row.last_seen_at),
        expiresAt: new Date(row.expires_at),
        revokedAt: row.revoked_at === null ? null : new Date(row.revoked_at),
      };
    },

    async insert(record) {
      await pool.execute(INSERT_SESSION_SQL, [
        record.id,
        record.conversationId,
        record.sessionHash,
        record.createdAt,
        record.lastSeenAt,
        record.expiresAt,
      ]);
    },

    async touch(sessionId, lastSeenAt) {
      await pool.execute(TOUCH_SESSION_SQL, [lastSeenAt, sessionId]);
    },

    async revokeByHash(sessionHash, revokedAt) {
      await pool.execute(REVOKE_SESSION_BY_HASH_SQL, [revokedAt, sessionHash]);
    },

    async revokeAllForConversation(conversationId, revokedAt) {
      await pool.execute(REVOKE_SESSIONS_FOR_CONVERSATION_SQL, [
        revokedAt,
        conversationId,
      ]);
    },
  };
}

/**
 * Verifies the signed cookie and resolves the server-side session scope.
 * Returns `null` for every invalid, expired, revoked, forged or unknown-key
 * case. A store failure also resolves to `null` (fail closed): the caller maps
 * `null` to a single generic, non-enumerating response.
 */
export async function resolveVisitorSession(input: {
  readonly cookieValue: string | null | undefined;
  readonly signingKeys: VisitorSessionSigningKeys;
  readonly store: VisitorSessionStore;
  readonly now?: Date;
}): Promise<ResolvedVisitorSession | null> {
  const secret = readVisitorSessionSecret(input.cookieValue, input.signingKeys);
  if (secret === null) return null;

  const now = input.now ?? new Date();

  let record: VisitorSessionRecord | null;
  try {
    record = await input.store.findActiveByHash(
      hashVisitorSessionSecret(secret),
      now
    );
  } catch {
    return null;
  }

  if (record === null) return null;
  if (record.revokedAt !== null) return null;
  if (record.expiresAt.getTime() <= now.getTime()) return null;

  return { sessionId: record.id, conversationId: record.conversationId };
}
