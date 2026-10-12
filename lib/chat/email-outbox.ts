import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { parseAllowedOrigins } from "./http";
import {
  buildResumeLink,
  generateResumeToken,
  hashResumeToken,
  resolveResumeTokenTtl,
} from "./resume-token";

/**
 * Durable email outbox for chat resume messages (Criterios-Chat.md sections 6,
 * 8 and 9).
 *
 * Hard invariants:
 * - **Idempotent enqueue.** One row per operator reply, keyed by the sha256 of
 *   `conversation_id + message_id`; re-enqueues are no-ops.
 * - **No message body.** The outbox stores ids and status only — never a
 *   message body, visitor name, phone number or email address.
 * - **Bounded retries.** Transient failures retry with capped exponential
 *   backoff up to {@link EMAIL_OUTBOX_MAX_ATTEMPTS}; permanent rejections fail
 *   immediately. No retry loop runs in the request path: the batch is drained
 *   by the internal email worker.
 * - **Atomic claim.** Candidates are claimed with a conditional update so two
 *   workers never send the same row twice.
 * - **Never throws from the batch.** A missing recipient, a sender crash or a
 *   database hiccup on one row never interrupts the others.
 */

/** First retry delay (1 minute). */
export const EMAIL_OUTBOX_BASE_RETRY_MS = 60_000;

/** Retry delay ceiling (1 hour). */
export const EMAIL_OUTBOX_MAX_RETRY_MS = 3_600_000;

/** Total attempts (1 initial send + 4 retries) before a row is failed. */
export const EMAIL_OUTBOX_MAX_ATTEMPTS = 5;

/** Fixed, non-dynamic error codes persisted in `last_error_code`. */
export const EMAIL_ERROR_TRANSIENT = "resend_transient";
export const EMAIL_ERROR_PERMANENT = "resend_permanent";
export const EMAIL_ERROR_EXCEPTION = "send_exception";
export const EMAIL_ERROR_RECIPIENT_MISSING = "recipient_missing";

/* ── Idempotency key ──────────────────────────────────────────────── */

/**
 * sha256(conversation_id + message_id) — stable per reply, unique per
 * conversation, and safe to recompute anywhere.
 */
export function resumeEmailIdempotencyKey(input: {
  readonly conversationId: string;
  readonly messageId: string;
}): string {
  return createHash("sha256")
    .update(`${input.conversationId}${input.messageId}`, "utf8")
    .digest("hex");
}

/* ── Retry policy ─────────────────────────────────────────────────── */

/** Exponential delay for the given 1-based attempt, capped at the ceiling. */
export function nextEmailRetryDelayMs(attempt: number): number {
  if (!Number.isFinite(attempt) || attempt < 1) {
    return EMAIL_OUTBOX_BASE_RETRY_MS;
  }
  const delay = EMAIL_OUTBOX_BASE_RETRY_MS * 2 ** (attempt - 1);
  return Math.min(delay, EMAIL_OUTBOX_MAX_RETRY_MS);
}

export type EmailOutboxFailureState =
  | {
      readonly status: "pending";
      readonly nextAttemptAt: Date;
      readonly attempts: number;
      readonly errorCode: string;
    }
  | {
      readonly status: "failed";
      readonly attempts: number;
      readonly errorCode: string;
    };

/** Pure decision: retry with backoff, or fail once the attempt bound is spent. */
export function resolveEmailOutboxFailure(input: {
  readonly attempts: number;
  readonly now: Date;
  readonly errorCode: string;
}): EmailOutboxFailureState {
  if (input.attempts >= EMAIL_OUTBOX_MAX_ATTEMPTS) {
    return { status: "failed", attempts: input.attempts, errorCode: input.errorCode };
  }
  return {
    status: "pending",
    nextAttemptAt: new Date(input.now.getTime() + nextEmailRetryDelayMs(input.attempts)),
    attempts: input.attempts + 1,
    errorCode: input.errorCode,
  };
}

/* ── Outbox DAL ───────────────────────────────────────────────────── */

export type EmailOutboxStatus = "pending" | "processing" | "sent" | "failed";

export type EmailOutboxRecord = {
  readonly id: string;
  readonly conversationId: string;
  readonly emailType: "visitor_resume" | "operator_notification";
  readonly idempotencyKey: string;
  readonly status: EmailOutboxStatus;
  readonly attempts: number;
  readonly nextAttemptAt: Date | null;
  readonly lastErrorCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly sentAt: Date | null;
};

export interface EmailOutboxStore {
  /** Idempotent insert on the idempotency key; reports whether a row was added. */
  enqueue(input: {
    readonly id: string;
    readonly conversationId: string;
    readonly emailType: EmailOutboxRecord["emailType"];
    readonly idempotencyKey: string;
    readonly now: Date;
  }): Promise<boolean>;
  /** Atomically claims up to `limit` due pending rows for this worker. */
  claimDue(input: { readonly limit: number; readonly now: Date }): Promise<EmailOutboxRecord[]>;
  markSent(input: { readonly id: string; readonly now: Date }): Promise<void>;
  markRetry(input: {
    readonly id: string;
    readonly attempts: number;
    readonly nextAttemptAt: Date;
    readonly errorCode: string;
    readonly now: Date;
  }): Promise<void>;
  markFailed(input: {
    readonly id: string;
    readonly errorCode: string;
    readonly now: Date;
  }): Promise<void>;
}

const ENQUEUE_SQL =
  "INSERT INTO chat_email_outbox " +
  "(id, conversation_id, email_type, idempotency_key, status, attempts, " +
  "next_attempt_at, last_error_code, created_at, updated_at, sent_at) " +
  "VALUES (?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, ?) " +
  "ON DUPLICATE KEY UPDATE id = id";

// The SELECT picks due pending rows; `created_at <= ?` is a clock-skew guard
// so a row stamped in the future by a skewed node is not starved forever.
const CLAIM_SELECT_SQL =
  "SELECT id, conversation_id, email_type, idempotency_key, status, attempts, " +
  "next_attempt_at, last_error_code, created_at, updated_at, sent_at " +
  "FROM chat_email_outbox " +
  "WHERE status = 'pending' " +
  "AND (next_attempt_at IS NULL OR next_attempt_at <= ?) " +
  "AND created_at <= ? " +
  "ORDER BY created_at ASC " +
  "LIMIT ?";

const CLAIM_UPDATE_SQL =
  "UPDATE chat_email_outbox SET status = 'processing', updated_at = ? " +
  "WHERE id = ? AND status = 'pending'";

const MARK_SENT_SQL =
  "UPDATE chat_email_outbox SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?";

const MARK_RETRY_SQL =
  "UPDATE chat_email_outbox SET status = 'pending', attempts = ?, next_attempt_at = ?, " +
  "last_error_code = ?, updated_at = ? WHERE id = ?";

const MARK_FAILED_SQL =
  "UPDATE chat_email_outbox SET status = 'failed', last_error_code = ?, updated_at = ? WHERE id = ?";

type OutboxRow = RowDataPacket & {
  id: string;
  conversation_id: string;
  email_type: EmailOutboxRecord["emailType"];
  idempotency_key: string;
  status: EmailOutboxStatus;
  attempts: number;
  next_attempt_at: Date | null;
  last_error_code: string | null;
  created_at: Date;
  updated_at: Date;
  sent_at: Date | null;
};

function mapOutboxRow(row: OutboxRow): EmailOutboxRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    emailType: row.email_type,
    idempotencyKey: String(row.idempotency_key),
    status: row.status,
    attempts: Number(row.attempts ?? 0),
    nextAttemptAt: row.next_attempt_at == null ? null : new Date(row.next_attempt_at),
    lastErrorCode: row.last_error_code == null ? null : String(row.last_error_code),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sentAt: row.sent_at == null ? null : new Date(row.sent_at),
  };
}

/** Adapts a mysql2 pool to the {@link EmailOutboxStore} port. */
export function createEmailOutboxStore(pool: Pool): EmailOutboxStore {
  return {
    async enqueue(input) {
      try {
        const [result] = await pool.execute<ResultSetHeader>(ENQUEUE_SQL, [
          input.id,
          input.conversationId,
          input.emailType,
          input.idempotencyKey,
          input.now,
          input.now,
        ]);
        return Number(result.affectedRows ?? 0) > 0;
      } catch (error) {
        // A duplicate-key race means another writer enqueued the same reply.
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
          return false;
        }
        throw error;
      }
    },

    async claimDue(input) {
      const [rows] = await pool.query<OutboxRow[]>(CLAIM_SELECT_SQL, [
        input.now,
        input.now,
        input.limit,
      ]);
      const claimed: EmailOutboxRecord[] = [];
      for (const row of rows) {
        const [result] = await pool.execute<ResultSetHeader>(CLAIM_UPDATE_SQL, [
          input.now,
          row.id,
        ]);
        // 0 affected rows means a concurrent worker claimed it first.
        if (Number(result.affectedRows ?? 0) > 0) {
          claimed.push(mapOutboxRow(row));
        }
      }
      return claimed;
    },

    async markSent(input) {
      await pool.execute<ResultSetHeader>(MARK_SENT_SQL, [input.now, input.now, input.id]);
    },

    async markRetry(input) {
      await pool.execute<ResultSetHeader>(MARK_RETRY_SQL, [
        input.attempts,
        input.nextAttemptAt,
        input.errorCode,
        input.now,
        input.id,
      ]);
    },

    async markFailed(input) {
      await pool.execute<ResultSetHeader>(MARK_FAILED_SQL, [
        input.errorCode,
        input.now,
        input.id,
      ]);
    },
  };
}

/** Generates the server-side id for a new outbox row. */
export function newEmailOutboxId(): string {
  return randomUUID();
}

/* ── Batch processing ─────────────────────────────────────────────── */

export type EmailSendResult = { readonly ok: true } | { readonly ok: false; readonly permanent: boolean };

export interface EmailSender {
  /** Sends a fixed-content resume email; never throws. */
  send(input: { readonly to: string; readonly resumeUrl: string }): Promise<EmailSendResult>;
}

export type EmailOutboxBatchReport = {
  readonly claimed: number;
  readonly sent: number;
  readonly retried: number;
  readonly failed: number;
};

/**
 * Claims and processes one bounded batch. Every row failure is isolated: the
 * batch always resolves with per-outcome counts and never throws.
 */
export async function processEmailOutboxBatch(input: {
  readonly store: EmailOutboxStore;
  readonly sender: EmailSender;
  readonly loadRecipient: (row: EmailOutboxRecord) => Promise<string | null>;
  readonly mintResumeUrl: (input: {
    readonly conversationId: string;
    readonly now: Date;
  }) => Promise<string | null>;
  readonly now: Date;
  readonly limit: number;
  /** Dry run reports zeros and claims nothing; used for worker health checks. */
  readonly dryRun?: boolean;
}): Promise<EmailOutboxBatchReport> {
  if (input.dryRun === true) {
    return { claimed: 0, sent: 0, retried: 0, failed: 0 };
  }
  const rows = await input.store.claimDue({ limit: input.limit, now: input.now });
  const report: { claimed: number; sent: number; retried: number; failed: number } = {
    claimed: rows.length,
    sent: 0,
    retried: 0,
    failed: 0,
  };

  for (const row of rows) {
    try {
      const recipient = await input.loadRecipient(row);
      const resumeUrl = await input.mintResumeUrl({
        conversationId: row.conversationId,
        now: input.now,
      });
      // A null resume URL (unconfigured origin, token insert failed) is a
      // transient condition: retry instead of mailing a broken link.
      const result =
        resumeUrl === null
          ? ({ ok: false, permanent: false } as const)
          : await input.sender.send({ to: recipient ?? "", resumeUrl });

      if (result.ok) {
        await input.store.markSent({ id: row.id, now: input.now });
        report.sent += 1;
        continue;
      }

      const errorCode = result.permanent ? EMAIL_ERROR_PERMANENT : EMAIL_ERROR_TRANSIENT;
      if (result.permanent || row.attempts + 1 >= EMAIL_OUTBOX_MAX_ATTEMPTS) {
        await input.store.markFailed({ id: row.id, errorCode, now: input.now });
        report.failed += 1;
      } else {
        await input.store.markRetry({
          id: row.id,
          attempts: row.attempts + 1,
          nextAttemptAt: new Date(input.now.getTime() + nextEmailRetryDelayMs(row.attempts + 1)),
          errorCode,
          now: input.now,
        });
        report.retried += 1;
      }
    } catch {
      // Sender crash, missing recipient or a transient database error: retry
      // this row while attempts remain, otherwise fail it. Never rethrow.
      const failure = resolveEmailOutboxFailure({
        attempts: row.attempts + 1,
        now: input.now,
        errorCode: EMAIL_ERROR_EXCEPTION,
      });
      if (failure.status === "failed") {
        await input.store.markFailed({ id: row.id, errorCode: failure.errorCode, now: input.now });
        report.failed += 1;
      } else {
        await input.store.markRetry({
          id: row.id,
          attempts: failure.attempts,
          nextAttemptAt: failure.nextAttemptAt,
          errorCode: failure.errorCode,
          now: input.now,
        });
        report.retried += 1;
      }
    }
  }

  return report;
}

/* ── Worker adapters ──────────────────────────────────────────────── */

type ConversationEmailRow = RowDataPacket & { visitor_email: string | null };

const SELECT_VISITOR_EMAIL_SQL =
  "SELECT visitor_email FROM chat_conversations WHERE id = ? LIMIT 1";

/** Loads the recipient address for a resume email (server-side only). */
export type ResumeRecipientLoader = (row: EmailOutboxRecord) => Promise<string | null>;

/**
 * Loads the recipient address for a resume email. The address lives only in
 * this server-side path: it never enters the outbox row, a log or a response.
 */
export function createResumeRecipientLoader(pool: Pool): ResumeRecipientLoader {
  return async (row: EmailOutboxRecord): Promise<string | null> => {
    const [rows] = await pool.query<ConversationEmailRow[]>(SELECT_VISITOR_EMAIL_SQL, [
      row.conversationId,
    ]);
    const email = rows[0]?.visitor_email;
    return typeof email === "string" && email.trim() !== "" ? email : null;
  };
}

const INSERT_RESUME_TOKEN_SQL =
  "INSERT INTO chat_resume_tokens " +
  "(id, conversation_id, token_hash, purpose, created_at, expires_at) " +
  "VALUES (?, ?, ?, 'resume', ?, ?)";

/**
 * Mints the resume URL at send time (see the Phase 6 decision record: the
 * outbox row has no payload column, so the opaque token cannot be pre-stored).
 * The link origin is the first `ALLOWED_ORIGINS` entry and the language is
 * fixed to `es`. Returns `null` when the origin is unconfigured or the token
 * cannot be persisted — the row then retries instead of mailing a broken link.
 */
export function createResumeUrlMinter(input: {
  readonly pool: Pool;
  readonly env: { readonly [key: string]: string | undefined };
  readonly ttlSeconds?: number;
}): (input: { readonly conversationId: string; readonly now: Date }) => Promise<string | null> {
  return async (mintInput): Promise<string | null> => {
    const origin = parseAllowedOrigins(input.env.ALLOWED_ORIGINS)[0];
    if (origin === undefined) return null;
    const token = generateResumeToken();
    const expiresAt = new Date(
      mintInput.now.getTime() +
        (input.ttlSeconds ?? resolveResumeTokenTtl(input.env)) * 1_000
    );
    await input.pool.execute(INSERT_RESUME_TOKEN_SQL, [
      newEmailOutboxId(),
      mintInput.conversationId,
      hashResumeToken(token),
      mintInput.now,
      expiresAt,
    ]);
    return buildResumeLink({ origin, lang: "es", token });
  };
}

/* ── Resend HTTP sender ───────────────────────────────────────────── */

/** Fixed Spanish subject; the body carries only the opaque resume link. */
export const EMAIL_RESUME_SUBJECT = "Tu conversación de chat continúa";

function buildResumeEmailHtml(resumeUrl: string): string {
  return [
    "<p>Hola,</p>",
    "<p>Tu conversación de chat con el equipo de Mas Cerca AP sigue abierta.",
    " Puedes continuarla desde el siguiente enlace:</p>",
    `<p><a href="${resumeUrl}">Continuar mi conversación</a></p>`,
    "<p>Si no solicitaste este mensaje, ignóralo.</p>",
  ].join("");
}

/**
 * Sends the resume email through the Resend HTTP API (no SDK). 4xx responses
 * are permanent rejections, 429/5xx/network errors are transient, and a
 * missing API key degrades to a transient failure instead of throwing.
 */
export function createResendEmailSender(
  env: { readonly [key: string]: string | undefined },
  fetchImpl: typeof fetch = fetch
): EmailSender {
  return {
    async send(input) {
      const apiKey = env.RESEND_API_KEY;
      if (!apiKey || !env.RESEND_FROM_EMAIL) {
        return { ok: false, permanent: false };
      }
      try {
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL,
            to: [input.to],
            subject: EMAIL_RESUME_SUBJECT,
            html: buildResumeEmailHtml(input.resumeUrl),
          }),
        });
        if (response.ok) {
          return { ok: true };
        }
        const permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
        return { ok: false, permanent };
      } catch {
        return { ok: false, permanent: false };
      }
    },
  };
}
