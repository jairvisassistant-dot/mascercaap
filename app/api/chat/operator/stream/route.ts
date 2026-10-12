import "server-only";

import { chatConfig } from "@/lib/chat/config";
import {
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatErrorResponseJson,
  chatRateLimitedResponse,
  chatUnavailableResponse,
  logChatServerEvent,
  resolveTrustedRequestKey,
} from "@/lib/chat/http";
import { getOperatorIdentity, requireOperatorAuth } from "@/lib/chat/operator-auth";
import {
  CHAT_OPERATOR_SIGNAL_SCOPE,
  CHAT_SSE_MAX_PER_IP,
  CHAT_SSE_MAX_PER_SESSION,
  buildChatSseResponse,
  getChatSignalHub,
  hashChatStreamKey,
} from "@/lib/chat/realtime";

/**
 * Coordinator realtime stream.
 *
 * Reuses the existing admin/MFA boundary and never trusts a client-supplied
 * identity. It subscribes to the single coordinator channel, so any
 * conversation change wakes every open inbox; the event stays opaque (no
 * conversation id, visitor data or message content). Caps are keyed by the
 * server-derived operator identity and the hashed client IP.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Platform execution ceiling, kept above the hub's own 120 s graceful close so
// the stream always ends on our terms and the client reconnects deliberately.
export const maxDuration = 150;

export async function GET(request: Request): Promise<Response> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  // Safe, session-authorized read: an absent Origin is tolerated while an
  // explicit foreign Origin stays 403.
  const originError = assertChatRequestOrigin(request, process.env, {
    allowAbsentOrigin: true,
  });
  if (originError) return originError;

  const authError = await requireOperatorAuth(request);
  if (authError) return chatErrorResponseJson(authError.status);

  const identity = getOperatorIdentity();
  if (identity === null) return chatUnavailableResponse();

  const operatorKey = hashChatStreamKey(identity.operatorId);
  const ipKey = hashChatStreamKey(resolveTrustedRequestKey(request));

  const result = getChatSignalHub().subscribe({
    scope: CHAT_OPERATOR_SIGNAL_SCOPE,
    keys: [
      { key: operatorKey, max: CHAT_SSE_MAX_PER_SESSION },
      { key: ipKey, max: CHAT_SSE_MAX_PER_IP },
    ],
  });
  if (!result.ok) {
    logChatServerEvent("chat_stream_rejected");
    return chatRateLimitedResponse(result.retryAfterSeconds);
  }

  return buildChatSseResponse(result.subscription, request.signal);
}
