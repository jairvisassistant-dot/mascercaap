import "server-only";

import type { Pool, RowDataPacket } from "mysql2/promise";

import {
  buildCleanupCompletedEvent,
  buildConversationPurgedEvent,
  writeChatMetricEventBestEffort,
  type ChatMetricsEvent,
  type ChatMetricsEventWriter,
} from "./metrics";
import {
  purgeChatConversation,
  type ChatPurgeConnection,
  type ChatPurgeDatabase,
} from "./purge";

/**
 * Scheduled retention cleanup for closed chat conversations
 * (Criterios-Chat.md section 11, PlanImplementacion-Chat.md Phase 8).
 *
 * This module is split in two deliberately reviewable halves:
 *
 * 1. A **pure selector builder** (`buildRetentionCandidateSelector`) with no
 *    I/O: it produces the bounded, deterministic candidate read. No retention
 *    window default exists anywhere in this module — the window is always an
 *    explicit parameter, because D1 (the production period) is still open.
 * 2. A **cleanup runner** (`runRetentionCleanup`) that purges each candidate
 *    through the existing transactional `purgeChatConversation` service.
 *
 * Safety properties (each one is covered by `retention.test.ts`):
 * - Only `status = 'closed'` rows whose `closed_at` is older than the window
 *   are candidates. Open and assigned conversations can never be selected, and
 *   `chat_contact_consents` is never read or written: independent commercial
 *   consent survives every cleanup (section 11.2).
 * - Bounded batches (`LIMIT ?`) with a deterministic `ORDER BY closed_at, id`
 *   so repeated runs walk the same rows in the same order.
 * - Every value is a bound parameter; no value is ever interpolated into SQL.
 * - Single-claim concurrency: the eligibility guard runs **inside** the purge
 *   transaction, so the row lock is held until the physical delete commits and
 *   a concurrent run sees the row as already gone (counted as skipped, never
 *   as purged twice).
 * - Idempotent: an already-purged or missing row fails the guard and resolves
 *   as `skipped_open`, so a second run over the same data deletes nothing.
 * - The execution log is `{scanned, purged, skipped_open, dryRun}` — counts
 *   only, never an id, name, email, phone or message body.
 * - Metric emission (LC-WU-12) is **opt-in and best-effort**: when a
 *   `metrics` sink is supplied the runner writes one `conversation_purged`
 *   marker per purged row (always with a `NULL` conversation id, so the
 *   cascade cannot erase it) and one `cleanup_completed` marker per run. A
 *   metric failure is swallowed and never changes the report; without a sink
 *   the run behaves exactly as before.
 */

/** Batch bounds used by the internal cleanup route. */
export const CHAT_RETENTION_BATCH_LIMIT_DEFAULT = 10;
export const CHAT_RETENTION_BATCH_LIMIT_MAX = 50;

/**
 * Bounds for the retention window. D1 is open, so no default period ships:
 * the minimum of one day keeps a typo from wiping freshly closed threads and
 * the maximum keeps an absurd value from underflowing the cutoff date.
 */
export const CHAT_RETENTION_MIN_OLDER_THAN_DAYS = 1;
export const CHAT_RETENTION_MAX_OLDER_THAN_DAYS = 36_500;

/** Only closed conversations are ever eligible for automatic cleanup. */
export const CHAT_RETENTION_CLOSED_STATUS = "closed";

const MS_PER_DAY = 86_400_000;

/** Raised for malformed retention inputs before any SQL is built. */
export class ChatRetentionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatRetentionInputError";
  }
}

/**
 * Raised by the claim guard when a candidate is no longer eligible (reopened,
 * already purged, or never existed). It is internal control flow: the runner
 * converts it into `skipped_open` and never lets it escape as a failure.
 */
export class RetentionClaimSkippedError extends Error {
  constructor() {
    super("Retention candidate is not eligible for purge.");
    this.name = "RetentionClaimSkippedError";
  }
}

/** Validates an explicit retention window; there is no default value. */
export function assertRetentionOlderThanDays(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ChatRetentionInputError("Retention window must be an integer.");
  }
  if (value < CHAT_RETENTION_MIN_OLDER_THAN_DAYS) {
    throw new ChatRetentionInputError("Retention window is below the minimum.");
  }
  if (value > CHAT_RETENTION_MAX_OLDER_THAN_DAYS) {
    throw new ChatRetentionInputError("Retention window is above the maximum.");
  }
  return value;
}

/** Parses `?olderThanDays`; `null` means missing or invalid (caller maps to 400). */
export function parseRetentionOlderThanDays(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const parsed = Number(raw);
  try {
    return assertRetentionOlderThanDays(parsed);
  } catch {
    return null;
  }
}

/** Clamps `?limit` to a bounded positive integer batch size. */
export function clampRetentionBatchLimit(raw: string | null): number {
  if (raw === null) return CHAT_RETENTION_BATCH_LIMIT_DEFAULT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return CHAT_RETENTION_BATCH_LIMIT_DEFAULT;
  }
  return Math.min(parsed, CHAT_RETENTION_BATCH_LIMIT_MAX);
}

/** Validates a batch limit before it reaches the selector (integer, ≥ 1, bounded). */
function resolveRetentionBatchLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new ChatRetentionInputError("Batch limit must be a positive integer.");
  }
  return Math.min(value, CHAT_RETENTION_BATCH_LIMIT_MAX);
}

/* ── Pure selector ────────────────────────────────────────────────── */

/**
 * Candidate read: single table, closed only, older than the cutoff,
 * deterministic order, bounded batch. `chat_conversations_cleanup_idx
 * (status, closed_at)` in migration 001 backs this statement.
 */
export const SELECT_RETENTION_CANDIDATES_SQL =
  "SELECT id FROM chat_conversations " +
  "WHERE status = ? AND closed_at IS NOT NULL AND closed_at < ? " +
  "ORDER BY closed_at ASC, id ASC LIMIT ?";

export type RetentionCandidateSelector = {
  readonly sql: string;
  /** `[status, cutoff, limit]` — every value bound, never interpolated. */
  readonly params: readonly [string, Date, number];
};

export function buildRetentionCandidateSelector(input: {
  readonly olderThanDays: number;
  readonly limit: number;
  readonly now: Date;
}): RetentionCandidateSelector {
  const olderThanDays = assertRetentionOlderThanDays(input.olderThanDays);
  const limit = resolveRetentionBatchLimit(input.limit);
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    throw new ChatRetentionInputError("Run time must be a valid date.");
  }

  return {
    sql: SELECT_RETENTION_CANDIDATES_SQL,
    params: [
      CHAT_RETENTION_CLOSED_STATUS,
      new Date(input.now.getTime() - olderThanDays * MS_PER_DAY),
      limit,
    ],
  };
}

/* ── Candidate store ──────────────────────────────────────────────── */

export interface RetentionCandidateStore {
  /** Returns candidate conversation **ids** (no visitor data is selected). */
  listCandidates(selector: RetentionCandidateSelector): Promise<readonly string[]>;
}

/** mysql2 adapter for {@link RetentionCandidateStore} (bound parameters only). */
export function createRetentionCandidateStore(pool: Pool): RetentionCandidateStore {
  return {
    async listCandidates(selector) {
      const [rows] = await pool.execute<RowDataPacket[]>(selector.sql, [
        ...selector.params,
      ]);
      if (!Array.isArray(rows)) {
        throw new ChatRetentionInputError("Unexpected candidate result shape.");
      }
      return rows.map((row) => {
        const id = (row as { id?: unknown }).id;
        if (typeof id !== "string" || id.length === 0) {
          throw new ChatRetentionInputError("Unexpected candidate row.");
        }
        return id;
      });
    },
  };
}

/* ── Claim guard ──────────────────────────────────────────────────── */

/**
 * Eligibility guard, executed as the first statement **inside** the purge
 * transaction so its row lock survives until the physical delete commits.
 *
 * The self-advance of `updated_at` is what makes `affectedRows` meaningful
 * under both MySQL result conventions (matched rows, mysql2's default
 * `CLIENT_FOUND_ROWS`, and changed rows): a matched row always changes. The
 * write is never observable — it is either rolled back or followed by the
 * deletion of the very same row in the same transaction.
 */
export const CLAIM_CLOSED_CONVERSATION_SQL =
  "UPDATE chat_conversations SET updated_at = TIMESTAMPADD(MICROSECOND, 1, updated_at) " +
  "WHERE id = ? AND status = ? AND closed_at IS NOT NULL AND closed_at < ?";

/** Wraps the purge database so a claim precedes the purge plan per candidate. */
export function createClaimGuardedPurgeDatabase(input: {
  readonly inner: ChatPurgeDatabase;
  readonly conversationId: string;
  readonly status: string;
  readonly cutoff: Date;
}): ChatPurgeDatabase {
  return {
    async transaction<T>(work: (connection: ChatPurgeConnection) => Promise<T>): Promise<T> {
      return input.inner.transaction(async (connection) => {
        const claim = await connection.execute(CLAIM_CLOSED_CONVERSATION_SQL, [
          input.conversationId,
          input.status,
          input.cutoff,
        ]);
        if (claim.affectedRows !== 1) throw new RetentionClaimSkippedError();
        return work(connection);
      });
    },
  };
}

/* ── Cleanup runner ───────────────────────────────────────────────── */

export type RetentionCleanupReport = {
  /** Candidates returned by the selector in this batch. */
  readonly scanned: number;
  /** Conversations physically purged by this run. */
  readonly purged: number;
  /** Candidates that failed the claim guard (reopened or already purged). */
  readonly skipped_open: number;
  /** True when the run only counted candidates. */
  readonly dryRun: boolean;
};

/**
 * Runs one bounded, idempotent cleanup batch.
 *
 * Rejects only on an unexpected database failure, so a partial run is never
 * silently reported as success: the caller maps the rejection to a fixed log
 * event and a zeroed report.
 */
export async function runRetentionCleanup(input: {
  readonly store: RetentionCandidateStore;
  readonly purgeDatabase: ChatPurgeDatabase;
  readonly olderThanDays: number;
  readonly limit: number;
  readonly now: Date;
  readonly dryRun?: boolean;
  /**
   * Optional metric sink (LC-WU-12). Best-effort by contract: every write is
   * swallowed, so a metrics failure can never fail or slow down the cleanup.
   * When absent, the run emits no metric event at all.
   */
  readonly metrics?: ChatMetricsEventWriter;
}): Promise<RetentionCleanupReport> {
  const selector = buildRetentionCandidateSelector({
    olderThanDays: input.olderThanDays,
    limit: input.limit,
    now: input.now,
  });

  const candidates = await input.store.listCandidates(selector);

  if (input.dryRun === true) {
    return { scanned: candidates.length, purged: 0, skipped_open: 0, dryRun: true };
  }

  let purged = 0;
  let skippedOpen = 0;
  const cutoff = selector.params[1];

  // Best-effort metric emission: the writer helper swallows its own failures,
  // so awaiting it can never fail the cleanup.
  const emit = async (event: ChatMetricsEvent): Promise<void> => {
    const metrics = input.metrics;
    if (metrics === undefined) return;
    await writeChatMetricEventBestEffort(metrics, event);
  };

  for (const conversationId of candidates) {
    try {
      await purgeChatConversation(
        conversationId,
        createClaimGuardedPurgeDatabase({
          inner: input.purgeDatabase,
          conversationId,
          status: selector.params[0],
          cutoff,
        })
      );
      purged += 1;
      // The conversation row is already gone, so the marker is written with a
      // NULL conversation id: `ON DELETE CASCADE` must not erase the evidence.
      await emit(buildConversationPurgedEvent({ occurredAt: input.now }));
    } catch (error) {
      if (error instanceof RetentionClaimSkippedError) {
        skippedOpen += 1;
        continue;
      }
      throw error;
    }
  }

  await emit(buildCleanupCompletedEvent({ occurredAt: input.now }));

  return { scanned: candidates.length, purged, skipped_open: skippedOpen, dryRun: false };
}
