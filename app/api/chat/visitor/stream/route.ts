import "server-only";

import { chatConfig } from "@/lib/chat/config";
import { getChatPool } from "@/lib/chat/db";
import {
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatRateLimitedResponse,
  chatUnauthorizedResponse,
  chatUnavailableResponse,
  logChatServerEvent,
  resolveRequestVisitorSession,
  resolveTrustedRequestKey,
} from "@/lib/chat/http";
import {
  CHAT_SSE_MAX_PER_IP,
  CHAT_SSE_MAX_PER_SESSION,
  buildChatSseResponse,
  getChatSignalHub,
  hashChatStreamKey,
} from "@/lib/chat/realtime";
import {
  createVisitorSessionStore,
  parseVisitorSessionSigningKeys,
} from "@/lib/chat/visitor-session";

/**
 * Visitor realtime stream.
 *
 * Authenticated by the same signed visitor session cookie as the rest of the
 * visitor API; the conversation scope comes only from the server-resolved
 * session. The stream carries opaque `conversation_changed` wake-ups and
 * heartbeats only — never a body, name, email, phone, id or token. It is gated
 * by `CHAT_ENABLED`, the safe-read origin policy and the per-session/IP caps in
 * the in-process signal hub.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Platform execution ceiling, kept above the hub's own 120 s graceful close so
// the stream always ends on our terms and the client reconnects deliberately.
export const maxDuration = 150;

export async function GET(request: Request): Promise<Response> {
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

  const sessionKey = hashChatStreamKey(session.sessionId);
  const ipKey = hashChatStreamKey(resolveTrustedRequestKey(request));

  const result = getChatSignalHub().subscribe({
    scope: session.conversationId,
    keys: [
      { key: sessionKey, max: CHAT_SSE_MAX_PER_SESSION },
      { key: ipKey, max: CHAT_SSE_MAX_PER_IP },
    ],
  });
  if (!result.ok) {
    logChatServerEvent("chat_stream_rejected");
    return chatRateLimitedResponse(result.retryAfterSeconds);
  }

  return buildChatSseResponse(result.subscription, request.signal);
}
