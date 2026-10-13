import "server-only";

import type { NextResponse } from "next/server";

import { chatConfig } from "@/lib/chat/config";
import { getChatPool } from "@/lib/chat/db";
import {
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatErrorResponseJson,
  chatInvalidRequestResponse,
  chatJsonResponse,
  chatUnavailableResponse,
  logChatServerEvent,
} from "@/lib/chat/http";
import { getOperatorIdentity, requireOperatorAuth } from "@/lib/chat/operator-auth";
import {
  aggregateChatMetrics,
  createMetricsReportStore,
  parseMetricsGranularity,
  parseMetricsRange,
  parseSlaMinutes,
  utcStartOfNextDay,
  utcStartOfDay,
} from "@/lib/chat/metrics";

/**
 * Coordinator reporting endpoint (Criterios-Chat.md section 11, Phase 9).
 *
 * - Same admin/MFA boundary as the inbox (`requireOperatorAuth`); a client can
 *   never choose the operator identity.
 * - `CHAT_ENABLED` gate, strict origin allowlist (an absent `Origin` is
 *   tolerated only for this authorized safe read) and a generic, non-enumerating
 *   error envelope with `Cache-Control: no-store`.
 * - Query contract: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (both required, ordered,
 *   inclusive, at most 366 days), `&granularity=day|week|month` (default `day`)
 *   and `&slaMinutes=<positive integer>` (optional: absent → D3 pending).
 *   Unknown parameters are rejected instead of silently ignored.
 * - The payload is aggregate only: counts, approved codes and dates. It never
 *   carries a conversation id, message text, name, email, phone, token or push
 *   endpoint — the store rows are projected inside `aggregateChatMetrics`.
 *
 * D3 (first-response SLA) is still open, so SLA compliance is reported as
 * `slaCompliance: null` + `slaPending: true` unless the caller supplies an
 * explicit `slaMinutes`; it is never displayed as a final KPI by default.
 */

/** Only these query keys are understood; anything else is a generic 400. */
const ALLOWED_QUERY_KEYS: ReadonlySet<string> = new Set([
  "from",
  "to",
  "granularity",
  "slaMinutes",
]);

export async function GET(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env, {
    allowAbsentOrigin: true,
  });
  if (originError) return originError;

  const authError = await requireOperatorAuth(request);
  if (authError) return chatErrorResponseJson(authError.status);

  const identity = getOperatorIdentity();
  if (identity === null) return chatUnavailableResponse();

  const url = new URL(request.url);
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return chatInvalidRequestResponse();
  }

  const range = parseMetricsRange(url.searchParams.get("from"), url.searchParams.get("to"));
  if (range === null) return chatInvalidRequestResponse();

  const granularity = parseMetricsGranularity(url.searchParams.get("granularity"));
  if (!granularity.ok) return chatInvalidRequestResponse();

  const sla = parseSlaMinutes(url.searchParams.get("slaMinutes"));
  if (!sla.ok) return chatInvalidRequestResponse();

  try {
    const store = createMetricsReportStore(getChatPool());
    const bounds = {
      from: utcStartOfDay(range.from),
      toExclusive: utcStartOfNextDay(range.to),
    };

    const [conversations, events, activeEligibleContacts, failedOutboxJobs] = await Promise.all([
      store.loadConversations(bounds),
      store.loadEvents(bounds),
      store.countActiveEligibleContacts(),
      store.countFailedOutboxJobs(),
    ]);

    const report = aggregateChatMetrics({
      conversations,
      events,
      from: range.from,
      to: range.to,
      granularity: granularity.value,
      slaMinutes: sla.value,
      activeEligibleContacts,
      failedOutboxJobs,
    });

    return chatJsonResponse({ success: true, data: report });
  } catch {
    // Fixed code only: the underlying error may carry request-derived values.
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
