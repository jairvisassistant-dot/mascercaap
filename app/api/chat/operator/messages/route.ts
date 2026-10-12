import "server-only";

import { randomUUID } from "node:crypto";

import type { NextResponse } from "next/server";

import { z } from "zod";

import { chatConfig } from "@/lib/chat/config";
import {
  CHAT_HISTORY_DEFAULT_LIMIT,
  CHAT_HISTORY_MAX_LIMIT,
} from "@/lib/chat/conversations";
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
import {
  OPERATOR_SENDER_TYPE,
  getOperatorIdentity,
  requireOperatorAuth,
} from "@/lib/chat/operator-auth";
import { createNotifyDeps, notifyVisitorOfOperatorReply } from "@/lib/chat/notify";
import { publishConversationChanged } from "@/lib/chat/realtime";
import {
  createOperatorConversationStore,
  decodeConversationHandle,
  isUsableCursorDate,
  persistOperatorReply,
  toOperatorConversationDetailView,
  toOperatorMessageView,
} from "@/lib/chat/operator-conversations";
import {
  decodeChatCursor,
  encodeChatCursor,
  operatorReplySchema,
} from "@/lib/chat/validation";

/**
 * Coordinator conversation thread: history (`GET`) and operator reply (`POST`).
 *
 * The conversation is addressed by an opaque handle, never by the raw internal
 * UUID. History paginates newest-first with the same composite `(created_at, id)`
 * cursor as the visitor thread. A reply is stamped with the server-derived
 * operator identity regardless of any role-shaped field on the payload, is
 * idempotent on `(conversation_id, client_message_id)`, and is limited to the same
 * 1–1000-character body bound as the visitor contract.
 */

const operatorReplyRequestSchema = operatorReplySchema.extend({
  conversationHandle: z.string().min(1).max(512),
});

function clampHistoryLimit(raw: string | null): number {
  if (raw === null) return CHAT_HISTORY_DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return CHAT_HISTORY_DEFAULT_LIMIT;
  return Math.min(CHAT_HISTORY_MAX_LIMIT, parsed);
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
  const conversationId = decodeConversationHandle(url.searchParams.get("conversationHandle"));
  if (conversationId === null) return chatInvalidRequestResponse();

  const cursorParam = url.searchParams.get("cursor");
  let cursor = null;
  if (cursorParam !== null) {
    cursor = decodeChatCursor(cursorParam);
    if (cursor === null || !isUsableCursorDate(cursor.createdAt)) {
      return chatInvalidRequestResponse();
    }
  }
  const limit = clampHistoryLimit(url.searchParams.get("limit"));

  try {
    const store = createOperatorConversationStore(getChatPool());
    const conversation = await store.findConversationById(conversationId);
    if (conversation === null) return chatNotFoundResponse();

    const messages = await store.listMessages({ conversationId, cursor, limit });
    const oldest = messages.length === limit ? messages[messages.length - 1] : undefined;
    const nextCursor =
      oldest === undefined
        ? null
        : encodeChatCursor({ createdAt: oldest.createdAt.toISOString(), id: oldest.id });

    return chatJsonResponse({
      success: true,
      data: {
        conversation: toOperatorConversationDetailView(conversation),
        messages: messages.map(toOperatorMessageView),
        nextCursor,
      },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
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

  const parsed = operatorReplyRequestSchema.safeParse(body.data);
  if (!parsed.success) return chatInvalidRequestResponse();

  const conversationId = decodeConversationHandle(parsed.data.conversationHandle);
  if (conversationId === null) return chatInvalidRequestResponse();

  try {
    const store = createOperatorConversationStore(getChatPool());
    const conversation = await store.findConversationById(conversationId);
    if (conversation === null) return chatNotFoundResponse();
    if (conversation.status === "closed") return chatErrorResponseJson(409);

    const result = await persistOperatorReply(
      {
        id: randomUUID(),
        conversationId,
        senderType: OPERATOR_SENDER_TYPE,
        senderName: identity.operatorId,
        body: parsed.data.body,
        clientMessageId: parsed.data.clientMessageId,
        operatorId: identity.operatorId,
        createdAt: new Date(),
      },
      store
    );

    // Persist before notify: the reply is committed; the resume email is
    // enqueued (idempotently) only when the visitor holds no fresh lease.
    if (!result.duplicated) {
      await notifyVisitorOfOperatorReply({
        conversationId,
        messageId: result.message.id,
        now: new Date(),
        emailEnabled: chatConfig.email,
        deps: createNotifyDeps({
          pool: getChatPool(),
          // The reply path never pushes; the transport is unused here.
          transport: { async send() { return { ok: false, gone: false }; } },
          operatorId: identity.operatorId,
          publish: publishConversationChanged,
        }),
      });
    }

    return chatJsonResponse({
      success: true,
      data: {
        message: toOperatorMessageView(result.message),
        duplicated: result.duplicated,
        status: "assigned",
      },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
