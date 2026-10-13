import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { Pool, ResultSetHeader } from "mysql2/promise";

/**
 * Server-only fixed-window rate limiter backed by MariaDB.
 *
 * Requirements honored here (Criterios-Chat.md section 8.4):
 * - 5 conversation opens and 5 message sends per window;
 * - the counter is keyed by a SHA-256 hash of a server-derived trusted key, so
 *   the raw address/conversation id is never stored or logged;
 * - the increment is a single atomic MariaDB statement, safe across concurrent
 *   requests, so two clients cannot both read the same count and both pass.
 *
 * The window start is an absolute UTC boundary derived from the epoch, so every
 * process agrees on the window without shared memory or a clock service.
 */

/** Window length in seconds. */
export const CHAT_RATE_LIMIT_WINDOW_SECONDS = 60;
/** Conversation-open limit per window. */
export const CHAT_RATE_LIMIT_MAX_OPEN = 5;
/** Visitor message limit per window. */
export const CHAT_RATE_LIMIT_MAX_MESSAGE = 5;

/** Rate-limited chat actions (mirrors `rate_limit_entries.action`). */
export const CHAT_RATE_LIMIT_ACTIONS = ["conversation_open", "message_send"] as const;
export type ChatRateLimitAction = (typeof CHAT_RATE_LIMIT_ACTIONS)[number];

/** Decision returned to a route; `retryAfterSeconds` is 0 when allowed. */
export type ChatRateLimitDecision = {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
};

/** Maximum requests permitted for an action in one window. */
export function maxRequestsForAction(action: ChatRateLimitAction): number {
  return action === "conversation_open"
    ? CHAT_RATE_LIMIT_MAX_OPEN
    : CHAT_RATE_LIMIT_MAX_MESSAGE;
}

/**
 * Floors a timestamp to its fixed-window boundary. Uses the epoch so the window
 * is identical for every process and independent of server local time.
 */
export function computeFixedWindowStart(now: Date, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/**
 * SHA-256 (hex) of `action:trustedKey`. Action-scoped so the same key does not
 * collide across actions, and one-way so the raw key never reaches the table or
 * a log line.
 */
export function hashRateLimitKey(
  action: ChatRateLimitAction,
  trustedKey: string
): string {
  return createHash("sha256").update(`${action}:${trustedKey}`, "utf8").digest("hex");
}

/** Pure decision: allowed at or below the max, otherwise denied with a retry hint. */
export function decideRateLimit(input: {
  readonly count: number;
  readonly max: number;
  readonly windowStart: Date;
  readonly windowSeconds: number;
  readonly now: Date;
}): ChatRateLimitDecision {
  if (input.count <= input.max) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  const windowEndMs = input.windowStart.getTime() + input.windowSeconds * 1000;
  const remainingSeconds = Math.ceil((windowEndMs - input.now.getTime()) / 1000);
  return { allowed: false, retryAfterSeconds: Math.max(1, remainingSeconds) };
}

/** Input for one atomic increment. */
export type ChatRateLimitIncrement = {
  readonly keyHash: string;
  readonly action: ChatRateLimitAction;
  readonly windowStart: Date;
  readonly windowSeconds: number;
  readonly maxRequests: number;
  readonly now: Date;
};

/** Port implemented by {@link createChatRateLimitStore}; mockable in tests. */
export interface ChatRateLimitStore {
  /** Atomically increments the window counter and returns the new count. */
  increment(input: ChatRateLimitIncrement): Promise<number>;
}

/**
 * Single-statement atomic upsert. `LAST_INSERT_ID(1)` seeds the count to 1 on a
 * fresh window; on conflict the row is locked and `LAST_INSERT_ID(request_count
 * + 1)` exposes the post-increment value through `insertId`. Concurrent writers
 * serialize on the unique `(key_hash, action, window_start)` key.
 */
const UPSERT_RATE_LIMIT_SQL =
  "INSERT INTO rate_limit_entries " +
  "(id, key_hash, action, window_start, window_seconds, max_requests, request_count, updated_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, LAST_INSERT_ID(1), ?) " +
  "ON DUPLICATE KEY UPDATE request_count = LAST_INSERT_ID(request_count + 1), updated_at = ?";

/** Adapts a mysql2 pool to {@link ChatRateLimitStore} (bound parameters only). */
export function createChatRateLimitStore(pool: Pool): ChatRateLimitStore {
  return {
    async increment(input) {
      const [result] = await pool.execute<ResultSetHeader>(UPSERT_RATE_LIMIT_SQL, [
        randomUUID(),
        input.keyHash,
        input.action,
        input.windowStart,
        input.windowSeconds,
        input.maxRequests,
        input.now,
        input.now,
      ]);
      const count = Number(result.insertId ?? 0);
      return Number.isFinite(count) && count > 0 ? count : 1;
    },
  };
}

/**
 * Enforces the fixed-window limit for an action/key pair and returns the
 * decision. A store failure propagates so the route can fail closed rather than
 * silently allowing traffic.
 */
export async function enforceChatRateLimit(input: {
  readonly store: ChatRateLimitStore;
  readonly action: ChatRateLimitAction;
  readonly trustedKey: string;
  readonly now?: Date;
}): Promise<ChatRateLimitDecision> {
  const now = input.now ?? new Date();
  const windowStart = computeFixedWindowStart(now, CHAT_RATE_LIMIT_WINDOW_SECONDS);
  const count = await input.store.increment({
    keyHash: hashRateLimitKey(input.action, input.trustedKey),
    action: input.action,
    windowStart,
    windowSeconds: CHAT_RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: maxRequestsForAction(input.action),
    now,
  });
  return decideRateLimit({
    count,
    max: maxRequestsForAction(input.action),
    windowStart,
    windowSeconds: CHAT_RATE_LIMIT_WINDOW_SECONDS,
    now,
  });
}
