import "server-only";

import type { NextResponse } from "next/server";

import { decideBotHandoff } from "@/lib/chat/bot";
import { chatConfig } from "@/lib/chat/config";
import {
  buildBotIntentMetricEvent,
  buildBotMessageCommand,
  buildVisitorMessageCommand,
  createChatMetricEventStore,
  createVisitorConversationStore,
  persistVisitorMessage,
  toVisitorMessageView,
} from "@/lib/chat/conversations";
import { getChatPool } from "@/lib/chat/db";
import {
  assertChatRequestOrigin,
  chatBoundedBodyErrorResponse,
  chatDisabledResponse,
  chatInvalidRequestResponse,
  chatJsonResponse,
  chatNotFoundResponse,
  chatRateLimitedResponse,
  chatUnauthorizedResponse,
  chatUnavailableResponse,
  logChatServerEvent,
  readBoundedJsonBody,
  resolveRequestVisitorSession,
} from "@/lib/chat/http";
import { createChatRateLimitStore, enforceChatRateLimit } from "@/lib/chat/rate-limit";
import { getOperatorIdentity } from "@/lib/chat/operator-auth";
import {
  notifyOperatorOfVisitorMessage,
  createNotifyDeps,
} from "@/lib/chat/notify";
import { createWebPushTransport, resolveVapidConfig } from "@/lib/chat/push";
import { publishConversationChanged } from "@/lib/chat/realtime";
import { clientMessageSchema } from "@/lib/chat/validation";
import {
  createVisitorSessionStore,
  parseVisitorSessionSigningKeys,
} from "@/lib/chat/visitor-session";

/**
 * Visitor message send endpoint.
 *
 * The conversation scope comes only from the verified session cookie; the
 * sender identity/type is stamped server-side from the stored conversation, so
 * the payload can never claim to be another role or conversation. Sends are
 * idempotent on `(conversation_id, client_message_id)` and rate-limited to 5 per
 * fixed window keyed by the hashed conversation scope.
 *
 * The deterministic first-line bot (Phase 7) is a post-commit, best-effort
 * step behind `CHAT_BOT_ENABLED`: an approved catalog answer is persisted on
 * this same write path as a `bot` message, anything else becomes a handoff
 * that relies on the existing coordinator notification.
 */

export async function POST(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env);
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

  try {
    const decision = await enforceChatRateLimit({
      store: createChatRateLimitStore(getChatPool()),
      action: "message_send",
      trustedKey: session.conversationId,
    });
    if (!decision.allowed) return chatRateLimitedResponse(decision.retryAfterSeconds);
  } catch {
    logChatServerEvent("chat_rate_limit_error");
    return chatUnavailableResponse();
  }

  const body = await readBoundedJsonBody(request);
  if (!body.ok) return chatBoundedBodyErrorResponse(body.reason);

  const parsed = clientMessageSchema.safeParse(body.data);
  if (!parsed.success) return chatInvalidRequestResponse();

  const store = createVisitorConversationStore(getChatPool());
  try {
    const conversation = await store.findConversationById(session.conversationId);
    if (conversation === null) return chatNotFoundResponse();

    const result = await persistVisitorMessage(
      buildVisitorMessageCommand({
        conversationId: session.conversationId,
        senderName: conversation.visitorName,
        message: parsed.data,
        now: new Date(),
      }),
      store
    );

    // Persist before notify: the message is committed; everything below is a
    // best-effort, never-throwing signal (SSE wake-up + coordinator push).
    if (!result.duplicated) {
      // Deterministic first-line bot (Phase 7 / LC-WU-10). It runs only after
      // the visitor message is committed and only while CHAT_BOT_ENABLED is
      // the literal "true" (D6 gate): while the flag is off there is zero bot
      // behavior. Best-effort by contract — a classification, bot-reply or
      // intent-metric failure never fails the visitor send, and a handoff
      // simply relies on the existing operator notify/SSE path below.
      if (chatConfig.bot) {
        try {
          const decision = decideBotHandoff(parsed.data.body);
          let botReplied = false;
          if (!decision.handoff && decision.answer !== null) {
            try {
              await persistVisitorMessage(
                buildBotMessageCommand({
                  conversationId: session.conversationId,
                  visitorClientMessageId: parsed.data.clientMessageId,
                  body: decision.answer,
                  now: new Date(),
                }),
                store
              );
              botReplied = true;
            } catch {
              // Best effort: the visitor message stands; the coordinator is
              // still notified below, so the conversation reaches a human.
              logChatServerEvent("chat_bot_reply_error");
            }
          }
          // Intent metadata for aggregates: the closed intent CODE only —
          // never a message body, matched text or classifier debug output.
          try {
            await createChatMetricEventStore(getChatPool()).insertEvent(
              buildBotIntentMetricEvent({
                conversationId: session.conversationId,
                intent: decision.intent,
                botReplied,
                occurredAt: new Date(),
              })
            );
          } catch {
            logChatServerEvent("chat_bot_metric_error");
          }
        } catch {
          logChatServerEvent("chat_bot_error");
        }
      }

      const identity = getOperatorIdentity();
      const vapid = resolveVapidConfig(process.env);
      if (identity === null || vapid === null) {
        publishConversationChanged(session.conversationId);
      } else {
        await notifyOperatorOfVisitorMessage({
          conversationId: session.conversationId,
          now: new Date(),
          pushEnabled: chatConfig.push,
          deps: createNotifyDeps({
            pool: getChatPool(),
            transport: createWebPushTransport({ vapid }),
            operatorId: identity.operatorId,
            publish: publishConversationChanged,
          }),
        });
      }
    }

    return chatJsonResponse({
      success: true,
      data: {
        message: toVisitorMessageView(result.message),
        duplicated: result.duplicated,
      },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
