import "server-only";

import type { NextResponse } from "next/server";

import { z } from "zod";

import { chatConfig } from "@/lib/chat/config";
import { getChatPool } from "@/lib/chat/db";
import {
  assertChatRequestOrigin,
  chatBoundedBodyErrorResponse,
  chatDisabledResponse,
  chatErrorResponseJson,
  chatInvalidRequestResponse,
  chatJsonResponse,
  chatNotFoundResponse,
  chatUnavailableResponse,
  logChatServerEvent,
  readBoundedJsonBody,
} from "@/lib/chat/http";
import { getOperatorIdentity, requireOperatorAuth } from "@/lib/chat/operator-auth";
import {
  createOperatorConversationStore,
  decodeConversationHandle,
  toOperatorConversationDetailView,
} from "@/lib/chat/operator-conversations";
import {
  buildConversationClosedEvent,
  buildOutcomeClassifiedEvent,
  createChatMetricsEventWriter,
  writeChatMetricEventBestEffort,
  type ChatMetricsEvent,
} from "@/lib/chat/metrics";
import { createChatPurgeDatabase, purgeChatConversation } from "@/lib/chat/purge";
import { publishConversationChanged } from "@/lib/chat/realtime";
import { operatorCloseSchema } from "@/lib/chat/validation";

/**
 * Coordinator close / close-and-purge control.
 *
 * The close classification is mandatory and restricted to the exact approved
 * outcome set (`operatorCloseSchema`, `.strict()`), so a spoofed identity field
 * is rejected. A physical purge additionally requires the explicit destructive
 * confirmation (`confirmPurge`); purge runs through the existing transactional
 * `purgeChatConversation` service and always resolves to the same constant,
 * non-enumerating response, whether or not the conversation existed.
 */

const operatorCloseRequestSchema = operatorCloseSchema.extend({
  conversationHandle: z.string().min(1).max(512),
  confirmPurge: z.boolean().default(false),
});

/**
 * Best-effort metric emission for close and purge (LC-WU-12 gap closed by
 * LC-WU-13). Both the event builder and the database write are swallowed: a
 * metrics problem must never change the close or purge response, and the
 * `conversation_purged` marker is conversation-independent (NULL id) so it
 * survives the purge it records.
 */
async function emitCloseMetricEvent(build: () => ChatMetricsEvent): Promise<void> {
  try {
    await writeChatMetricEventBestEffort(createChatMetricsEventWriter(getChatPool()), build());
  } catch {
    // Best-effort by contract: the primary operation has already committed.
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env);
  if (originError) return originError;

  const authError = await requireOperatorAuth(request);
  if (authError) return chatErrorResponseJson(authError.status);

  const identity = getOperatorIdentity();
  if (identity === null) return chatUnavailableResponse();

  const body = await readBoundedJsonBody(request);
  if (!body.ok) return chatBoundedBodyErrorResponse(body.reason);

  const parsed = operatorCloseRequestSchema.safeParse(body.data);
  if (!parsed.success) return chatInvalidRequestResponse();

  const conversationId = decodeConversationHandle(parsed.data.conversationHandle);
  if (conversationId === null) return chatInvalidRequestResponse();

  if (parsed.data.purge) {
    if (!parsed.data.confirmPurge) return chatInvalidRequestResponse();
    try {
      await purgeChatConversation(conversationId, createChatPurgeDatabase(getChatPool()));
      // Deliberately no `conversation_purged` marker here: in
      // `aggregateChatMetrics` the `failed_cleanup_runs` detector is
      // `purged > 0 && cleanupRuns === 0`, which is only sound while purge
      // markers originate from retention runs (the sole writer of both
      // `conversation_purged` and `cleanup_completed`). An operator purge
      // recorded here would raise a false "cleanup failed" alert whenever
      // retention has never run. Recorded as a known, deliberate limitation in
      // `docs/chat/phase0-decision-record.md`.
      // Constant response: never reveals whether the conversation existed.
      return chatJsonResponse({ success: true, data: { status: "purged" } });
    } catch {
      logChatServerEvent("chat_db_error");
      return chatUnavailableResponse();
    }
  }

  try {
    const updated = await createOperatorConversationStore(getChatPool()).closeConversation({
      conversationId,
      operatorId: identity.operatorId,
      closeResult: parsed.data.closeResult,
      closeNote: parsed.data.closeNote ?? null,
      now: new Date(),
    });
    if (updated === null) return chatNotFoundResponse();

    // Persist before notify: the close is committed; the SSE wake-up tells
    // every open stream to re-read authorized state. A purge deletes the
    // conversation, so it deliberately publishes nothing.
    publishConversationChanged(conversationId);

    // Best-effort close metrics (LC-WU-12 gap closed by LC-WU-13): one
    // `conversation_closed` and one `outcome_classified` carrying only the
    // approved classification code — never the note, name or message text.
    const closedAt = updated.closedAt ?? new Date();
    await emitCloseMetricEvent(() =>
      buildConversationClosedEvent({ conversationId, occurredAt: closedAt })
    );
    await emitCloseMetricEvent(() =>
      buildOutcomeClassifiedEvent({
        conversationId,
        closeResult: parsed.data.closeResult,
        occurredAt: closedAt,
      })
    );

    return chatJsonResponse({
      success: true,
      data: { conversation: toOperatorConversationDetailView(updated) },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
