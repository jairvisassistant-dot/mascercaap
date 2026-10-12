import "server-only";

import type { NextResponse } from "next/server";

import { chatConfig } from "@/lib/chat/config";
import {
  CHAT_HISTORY_DEFAULT_LIMIT,
  CHAT_HISTORY_MAX_LIMIT,
  createVisitorConversationStore,
  toVisitorMessageView,
} from "@/lib/chat/conversations";
import { getChatPool } from "@/lib/chat/db";
import {
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatInvalidRequestResponse,
  chatJsonResponse,
  chatUnauthorizedResponse,
  chatUnavailableResponse,
  logChatServerEvent,
  resolveRequestVisitorSession,
} from "@/lib/chat/http";
import { decodeChatCursor, encodeChatCursor } from "@/lib/chat/validation";
import {
  createVisitorSessionStore,
  parseVisitorSessionSigningKeys,
} from "@/lib/chat/visitor-session";

/**
 * Authorized current-conversation history endpoint.
 *
 * The conversation is resolved only from the verified session cookie. History is
 * returned newest-first with an opaque composite `(created_at, id)` cursor so a
 * client can page without duplicates or gaps; a full page always carries the
 * next cursor. The internal conversation id never appears in the payload.
 */

function clampHistoryLimit(raw: string | null): number {
  if (raw === null) return CHAT_HISTORY_DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return CHAT_HISTORY_DEFAULT_LIMIT;
  return Math.min(CHAT_HISTORY_MAX_LIMIT, parsed);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  // Safe, session-authorized read: browsers omit Origin on same-origin GET, so
  // an absent Origin is tolerated while an explicit foreign Origin stays 403.
  const originError = assertChatRequestOrigin(request, process.env, {
    allowAbsentOrigin: true,
  });
  if (originError) return originError;

  let session;
  try {
    const signingKeys = parseVisitorSessionSigningKeys(process.env.CHAT_SESSION_SECRET);
    session = await resolveRequestVisitorSession({
      request,
      signingKeys,
      store: createVisitorSessionStore(getChatPool()),
    });
  } catch {
    logChatServerEvent("chat_config_error");
    return chatUnavailableResponse();
  }
  if (session === null) return chatUnauthorizedResponse();

  const url = new URL(request.url);
  const cursorParam = url.searchParams.get("cursor");
  let cursor = null;
  if (cursorParam !== null) {
    cursor = decodeChatCursor(cursorParam);
    if (cursor === null) return chatInvalidRequestResponse();
  }
  const limit = clampHistoryLimit(url.searchParams.get("limit"));

  try {
    const messages = await createVisitorConversationStore(getChatPool()).listMessages({
      conversationId: session.conversationId,
      cursor,
      limit,
    });

    const oldest = messages.length === limit ? messages[messages.length - 1] : undefined;
    const nextCursor =
      oldest === undefined
        ? null
        : encodeChatCursor({ createdAt: oldest.createdAt.toISOString(), id: oldest.id });

    return chatJsonResponse({
      success: true,
      data: {
        messages: messages.map(toVisitorMessageView),
        nextCursor,
      },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
