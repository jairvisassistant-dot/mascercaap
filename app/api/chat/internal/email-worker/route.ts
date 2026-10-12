import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin/auth";
import { chatConfig } from "@/lib/chat/config";
import { getChatPool } from "@/lib/chat/db";
import {
  createEmailOutboxStore,
  createResendEmailSender,
  createResumeRecipientLoader,
  createResumeUrlMinter,
  processEmailOutboxBatch,
} from "@/lib/chat/email-outbox";
import {
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatErrorResponseJson,
  chatJsonResponse,
  logChatServerEvent,
} from "@/lib/chat/http";

/**
 * Internal email-outbox worker, invoked by a scheduler (Vercel Cron or an
 * external cron) with `POST /api/chat/internal/email-worker`.
 *
 * Authorization is either the shared `x-chat-internal-secret` header (compared
 * timing-safe) or a valid admin session — whichever the deployment prefers.
 * The response carries counts only: no ids, recipients, tokens or links. The
 * `CHAT_EMAIL_ENABLED` flag is a kill switch that returns zero counts without
 * touching the outbox.
 */

const BATCH_LIMIT_DEFAULT = 10;
const BATCH_LIMIT_MAX = 25;

function clampBatchLimit(raw: string | null): number {
  if (raw === null) return BATCH_LIMIT_DEFAULT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return BATCH_LIMIT_DEFAULT;
  return Math.min(parsed, BATCH_LIMIT_MAX);
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
  const limit = clampBatchLimit(url.searchParams.get("limit"));
  const dryRun = url.searchParams.get("dryRun") === "1";

  // Kill switch: report zero counts without draining anything.
  if (!chatConfig.email) {
    return chatJsonResponse({ success: true, data: { claimed: 0, sent: 0, retried: 0, failed: 0 } });
  }

  try {
    const pool = getChatPool();
    const report = await processEmailOutboxBatch({
      store: createEmailOutboxStore(pool),
      sender: createResendEmailSender(process.env),
      loadRecipient: createResumeRecipientLoader(pool),
      mintResumeUrl: createResumeUrlMinter({ pool, env: process.env }),
      now: new Date(),
      limit,
      dryRun,
    });
    // Counts only: no ids, recipients, tokens or links cross this boundary.
    return chatJsonResponse({ success: true, data: report });
  } catch {
    // Fixed code only: the underlying error may carry request-derived values.
    logChatServerEvent("chat_email_worker_error");
    return chatJsonResponse({ success: true, data: { claimed: 0, sent: 0, retried: 0, failed: 0 } });
  }
}
