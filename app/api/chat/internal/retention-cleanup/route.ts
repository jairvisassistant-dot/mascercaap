import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin/auth";
import { chatConfig } from "@/lib/chat/config";
import { getChatPool } from "@/lib/chat/db";
import {
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatErrorResponseJson,
  chatInvalidRequestResponse,
  chatJsonResponse,
  logChatServerEvent,
} from "@/lib/chat/http";
import { createChatMetricsEventWriter } from "@/lib/chat/metrics";
import { createChatPurgeDatabase } from "@/lib/chat/purge";
import {
  clampRetentionBatchLimit,
  createRetentionCandidateStore,
  parseRetentionOlderThanDays,
  runRetentionCleanup,
} from "@/lib/chat/retention";

/**
 * Internal retention-cleanup endpoint, invoked by a scheduler (Hostinger cron,
 * Vercel Cron or an external cron) with
 * `POST /api/chat/internal/retention-cleanup?olderThanDays=<n>`.
 *
 * - **Authorization** mirrors the email worker: either the timing-safe
 *   `x-chat-internal-secret` header or a valid admin session.
 * - **`olderThanDays` is required and has no default.** D1 (the production
 *   retention period) is open, so the endpoint answers a generic 400 rather
 *   than inventing a period.
 * - **`CHAT_RETENTION_ENABLED` is the kill switch**: while it is off the
 *   endpoint reports a zeroed execution log and never touches the database.
 * - **`?limit` is clamped** to a bounded batch and **`?dryRun=1`** counts
 *   candidates without deleting anything.
 * - The response is the execution log `{scanned, purged, skipped_open,
 *   dryRun}` — counts only, never an id, name, email, phone or message body.
 */

function zeroReport(dryRun: boolean) {
  return { scanned: 0, purged: 0, skipped_open: 0, dryRun };
}

/** Timing-safe shared-secret comparison that never throws on length mismatch. */
function matchesInternalSecret(
  provided: string | null,
  expected: string | undefined
): boolean {
  if (provided === null || expected === undefined || expected === "") return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env, {
    allowAbsentOrigin: true,
  });
  if (originError) return originError;

  const secretAuthorized = matchesInternalSecret(
    request.headers.get("x-chat-internal-secret"),
    process.env.CHAT_INTERNAL_SECRET
  );
  if (!secretAuthorized) {
    const adminError = await requireAdminAuth(request);
    if (adminError) return chatErrorResponseJson(adminError.status);
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  // Required parameter, no production default: an absent or invalid window is
  // a generic 400, never an inferred period (D1 is still open).
  const olderThanDays = parseRetentionOlderThanDays(url.searchParams.get("olderThanDays"));
  if (olderThanDays === null) return chatInvalidRequestResponse();

  const limit = clampRetentionBatchLimit(url.searchParams.get("limit"));

  // Kill switch: report zero counts without selecting or purging anything.
  if (!chatConfig.retention) {
    return chatJsonResponse({ success: true, data: zeroReport(dryRun) });
  }

  try {
    const pool = getChatPool();
    const report = await runRetentionCleanup({
      store: createRetentionCandidateStore(pool),
      purgeDatabase: createChatPurgeDatabase(pool),
      olderThanDays,
      limit,
      now: new Date(),
      dryRun,
      // LC-WU-12 gap closed by LC-WU-13: hand the cleanup runner its optional
      // metric sink so `conversation_purged` and `cleanup_completed` rows are
      // written. The sink is best-effort inside the runner, so a metrics
      // failure can never fail or slow a cleanup run.
      metrics: createChatMetricsEventWriter(pool),
    });
    // Counts only: no ids, names, addresses or message content cross this boundary.
    return chatJsonResponse({ success: true, data: report });
  } catch {
    // Fixed code only: the underlying error may carry request-derived values.
    logChatServerEvent("chat_retention_error");
    return chatJsonResponse({ success: true, data: zeroReport(dryRun) });
  }
}
