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
  OPERATOR_INBOX_DEFAULT_LIMIT,
  OPERATOR_INBOX_MAX_LIMIT,
  createOperatorConversationStore,
  isUsableCursorDate,
  toOperatorConversationListItemView,
} from "@/lib/chat/operator-conversations";
import { CONVERSATION_STATUSES, type ConversationStatus } from "@/lib/chat/types";
import { decodeChatCursor, encodeChatCursor } from "@/lib/chat/validation";

/**
 * Coordinator inbox conversation list.
 *
 * The route reuses the existing admin/MFA boundary and never trusts a
 * client-supplied operator identity. It is gated by `CHAT_ENABLED`, the strict
 * origin policy (an absent `Origin` is tolerated only for this authorized safe
 * read), and returns `Cache-Control: no-store` with a generic error envelope.
 *
 * Pagination uses an opaque composite `(activity_at, id)` cursor, newest first,
 * with `nextCursor` only on a full page. Conversations are addressed downstream
 * by an opaque handle, never by the raw internal UUID.
 */

function clampInboxLimit(raw: string | null): number {
  if (raw === null) return OPERATOR_INBOX_DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return OPERATOR_INBOX_DEFAULT_LIMIT;
  return Math.min(OPERATOR_INBOX_MAX_LIMIT, parsed);
}

function isConversationStatus(value: string): value is ConversationStatus {
  return (CONVERSATION_STATUSES as readonly string[]).includes(value);
}

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

  const cursorParam = url.searchParams.get("cursor");
  let cursor = null;
  if (cursorParam !== null) {
    cursor = decodeChatCursor(cursorParam);
    if (cursor === null || !isUsableCursorDate(cursor.createdAt)) {
      return chatInvalidRequestResponse();
    }
  }

  const statusParam = url.searchParams.get("status");
  let status: ConversationStatus | null = null;
  if (statusParam !== null && statusParam !== "") {
    if (!isConversationStatus(statusParam)) return chatInvalidRequestResponse();
    status = statusParam;
  }

  const limit = clampInboxLimit(url.searchParams.get("limit"));

  try {
    const items = await createOperatorConversationStore(getChatPool()).listConversations({
      operatorId: identity.operatorId,
      status,
      cursor,
      limit,
    });

    const oldest = items.length === limit ? items[items.length - 1] : undefined;
    const nextCursor =
      oldest === undefined
        ? null
        : encodeChatCursor({
            createdAt: (oldest.lastMessageAt ?? oldest.createdAt).toISOString(),
            id: oldest.id,
          });

    return chatJsonResponse({
      success: true,
      data: {
        conversations: items.map(toOperatorConversationListItemView),
        nextCursor,
      },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
