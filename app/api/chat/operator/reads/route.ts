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
  chatUnavailableResponse,
  logChatServerEvent,
  readBoundedJsonBody,
} from "@/lib/chat/http";
import { getOperatorIdentity, requireOperatorAuth } from "@/lib/chat/operator-auth";
import {
  createOperatorConversationStore,
  decodeConversationHandle,
} from "@/lib/chat/operator-conversations";

/**
 * Coordinator per-conversation read cursor.
 *
 * Marking read is a single atomic, monotonic upsert of the server-derived
 * operator's `last_read_at` cursor; unread counts are always derived from that
 * cursor, never stored. The response is deliberately constant, so a valid-shaped
 * handle for a conversation that does not exist resolves identically to one that
 * does — the endpoint is not an existence oracle.
 */

const markReadSchema = z
  .object({
    conversationHandle: z.string().min(1).max(512),
  })
  .strict();

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

  const parsed = markReadSchema.safeParse(body.data);
  if (!parsed.success) return chatInvalidRequestResponse();

  const conversationId = decodeConversationHandle(parsed.data.conversationHandle);
  if (conversationId === null) return chatInvalidRequestResponse();

  try {
    await createOperatorConversationStore(getChatPool()).markConversationRead({
      operatorId: identity.operatorId,
      conversationId,
    });
    return chatJsonResponse({ success: true, data: { unreadCount: 0 } });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
