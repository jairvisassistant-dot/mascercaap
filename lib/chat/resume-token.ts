import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { VisitorSessionFields } from "./visitor-session";

/**
 * Server-only opaque resume-token helpers.
 *
 * An email resume link carries a random 256-bit token (`?k=<token>`) that never
 * encodes a conversation id. Only the SHA-256 hash is persisted, scoped to one
 * conversation and one purpose, with an explicit expiry. Redemption is atomic:
 * a single conditional `UPDATE` claims the token exactly once (blocking reuse,
 * revocation and expiry), then the same transaction replaces the visitor session.
 *
 * Any failure — reused, revoked, expired, purged (row deleted by FK cascade) or
 * a database error — resolves to the same generic `{ ok: false }`, so redemption
 * can never be used to enumerate resources.
 */

export const CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS = 604_800; // 7 days (proposed)
export const CHAT_RESUME_TOKEN_TTL_MIN_SECONDS = 60;
export const CHAT_RESUME_TOKEN_TTL_MAX_SECONDS = 2_592_000; // 30 days

/** Query parameter carrying the opaque token on `/[lang]/chat`. */
export const RESUME_TOKEN_QUERY_PARAM = "k";

const RESUME_TOKEN_BYTES = 32;

/** Generates a fresh 256-bit opaque resume token (base64url, no padding). */
export function generateResumeToken(): string {
  return randomBytes(RESUME_TOKEN_BYTES).toString("base64url");
}

/** SHA-256 hex digest stored in `chat_resume_tokens.token_hash` (CHAR(64)). */
export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Resolves the resume-token TTL from `CHAT_RESUME_TOKEN_TTL_SECONDS`. */
export function resolveResumeTokenTtl(env: {
  readonly [key: string]: string | undefined;
}): number {
  const raw = env.CHAT_RESUME_TOKEN_TTL_SECONDS;
  if (raw === undefined || raw.trim() === "") {
    return CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS;
  return Math.min(
    CHAT_RESUME_TOKEN_TTL_MAX_SECONDS,
    Math.max(CHAT_RESUME_TOKEN_TTL_MIN_SECONDS, parsed)
  );
}

/**
 * Builds the absolute resume link. The locale segment is validated before use
 * so a hostile `lang` cannot escape the path; the token stays in the query.
 */
export function buildResumeLink(input: {
  readonly origin: string;
  readonly lang: string;
  readonly token: string;
}): string {
  const base = input.origin.trim().replace(/\/+$/, "");
  const lang = /^[a-z]{2}$/.test(input.lang) ? input.lang : "es";
  const url = new URL(`/${lang}/chat`, base);
  url.searchParams.set(RESUME_TOKEN_QUERY_PARAM, input.token);
  return url.toString();
}

/** Persisted resume-token fields needed to judge usability. */
export type ResumeTokenRecord = {
  readonly conversationId: string;
  readonly purpose: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly revokedAt: Date | null;
};

/**
 * Pure usability judgement mirroring the atomic claim predicate: the token must
 * be a resume token, unused, unrevoked and strictly unexpired.
 */
export function isResumeTokenUsable(record: ResumeTokenRecord, now: Date): boolean {
  return (
    record.purpose === "resume" &&
    record.usedAt === null &&
    record.revokedAt === null &&
    record.expiresAt.getTime() > now.getTime()
  );
}

/** Input for an atomic redemption: the token hash plus the replacement session. */
export type ResumeTokenRedeemInput = {
  readonly tokenHash: string;
  readonly now: Date;
  /** New session fields; the conversation is taken from the claimed token row. */
  readonly newSession: VisitorSessionFields;
};

/** Discriminated redemption result; the failure branch carries no detail. */
export type ResumeTokenRedeemResult =
  | { readonly ok: true; readonly conversationId: string; readonly sessionId: string }
  | { readonly ok: false };

/** Port implemented by {@link createResumeTokenStore}; mockable in tests. */
export interface ResumeTokenStore {
  redeem(input: ResumeTokenRedeemInput): Promise<ResumeTokenRedeemResult>;
}

const CLAIM_TOKEN_SQL =
  "UPDATE chat_resume_tokens SET used_at = ? " +
  "WHERE token_hash = ? AND purpose = 'resume' " +
  "AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?";

const SELECT_TOKEN_CONVERSATION_SQL =
  "SELECT conversation_id FROM chat_resume_tokens WHERE token_hash = ?";

const REVOKE_SESSIONS_FOR_CONVERSATION_SQL =
  "UPDATE visitor_chat_sessions SET revoked_at = ? " +
  "WHERE conversation_id = ? AND revoked_at IS NULL";

const INSERT_SESSION_SQL =
  "INSERT INTO visitor_chat_sessions " +
  "(id, conversation_id, session_hash, created_at, last_seen_at, expires_at) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

type ConversationRow = RowDataPacket & { conversation_id: string };

/**
 * Adapts a mysql2 pool to the {@link ResumeTokenStore} port. The whole redemption
 * runs on one connection inside one transaction; every failure rolls back and
 * returns the generic failure result, and the connection is always released.
 */
export function createResumeTokenStore(pool: Pool): ResumeTokenStore {
  return {
    async redeem(input) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [claim] = await connection.execute<ResultSetHeader>(CLAIM_TOKEN_SQL, [
          input.now,
          input.tokenHash,
          input.now,
        ]);
        if (Number(claim.affectedRows ?? 0) !== 1) {
          await connection.rollback();
          return { ok: false };
        }

        const [rows] = await connection.query<ConversationRow[]>(
          SELECT_TOKEN_CONVERSATION_SQL,
          [input.tokenHash]
        );
        const conversationId = rows[0]?.conversation_id;
        if (typeof conversationId !== "string" || conversationId === "") {
          await connection.rollback();
          return { ok: false };
        }

        await connection.execute(REVOKE_SESSIONS_FOR_CONVERSATION_SQL, [
          input.now,
          conversationId,
        ]);
        await connection.execute(INSERT_SESSION_SQL, [
          input.newSession.id,
          conversationId,
          input.newSession.sessionHash,
          input.newSession.createdAt,
          input.newSession.lastSeenAt,
          input.newSession.expiresAt,
        ]);

        await connection.commit();
        return {
          ok: true,
          conversationId,
          sessionId: input.newSession.id,
        };
      } catch {
        await connection.rollback();
        return { ok: false };
      } finally {
        connection.release();
      }
    },
  };
}
