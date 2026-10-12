import "server-only";

import { randomUUID } from "node:crypto";

import type { NextResponse } from "next/server";

import { chatConfig } from "@/lib/chat/config";
import {
  captureChatEntryConsent,
  createContactConsentStore,
} from "@/lib/chat/consent";
import {
  createVisitorConversationStore,
  toVisitorConversationView,
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
  resolveTrustedRequestKey,
} from "@/lib/chat/http";
import { createChatRateLimitStore, enforceChatRateLimit } from "@/lib/chat/rate-limit";
import { chatEntrySchema } from "@/lib/chat/validation";
import {
  buildVisitorSessionCookieValue,
  createVisitorSessionMaterial,
  createVisitorSessionStore,
  parseVisitorSessionSigningKeys,
  resolveVisitorSessionTtl,
  toNewVisitorSession,
  visitorSessionCookieOptions,
} from "@/lib/chat/visitor-session";

/**
 * Visitor conversation entry point.
 *
 * - `POST` creates a conversation and its server session atomically, sets the
 *   hardened HttpOnly session cookie, and returns a safe conversation view that
 *   never includes the internal conversation id.
 * - `GET` reads only the conversation bound to the presented session.
 *
 * Every path is gated behind `CHAT_ENABLED` (generic disabled response), the
 * configured origin allowlist, the fixed-window open/read rules and generic
 * errors. No request-derived value is ever logged.
 */

export async function POST(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env);
  if (originError) return originError;

  try {
    const decision = await enforceChatRateLimit({
      store: createChatRateLimitStore(getChatPool()),
      action: "conversation_open",
      trustedKey: resolveTrustedRequestKey(request),
    });
    if (!decision.allowed) return chatRateLimitedResponse(decision.retryAfterSeconds);
  } catch {
    logChatServerEvent("chat_rate_limit_error");
    return chatUnavailableResponse();
  }

  const body = await readBoundedJsonBody(request);
  if (!body.ok) return chatBoundedBodyErrorResponse(body.reason);

  const parsed = chatEntrySchema.safeParse(body.data);
  if (!parsed.success) return chatInvalidRequestResponse();

  let signingKeys;
  try {
    signingKeys = parseVisitorSessionSigningKeys(process.env.CHAT_SESSION_SECRET);
  } catch {
    logChatServerEvent("chat_config_error");
    return chatUnavailableResponse();
  }

  const now = new Date();
  const ttlSeconds = resolveVisitorSessionTtl(process.env);
  const material = createVisitorSessionMaterial({ now, ttlSeconds });
  const conversationId = randomUUID();
  const session = toNewVisitorSession(material, conversationId);

  try {
    await createVisitorConversationStore(getChatPool()).createConversationWithSession({
      conversationId,
      visitorName: parsed.data.name,
      visitorEmail: parsed.data.email,
      visitorPhone: parsed.data.phone ?? null,
      sessionId: session.id,
      sessionHash: session.sessionHash,
      sessionCreatedAt: session.createdAt,
      sessionLastSeenAt: session.lastSeenAt,
      sessionExpiresAt: session.expiresAt,
      now,
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }

  // Post-commit, best-effort consent evidence: the conversation already
  // exists, so a consent insert failure must never fail the entry request.
  // The visitor opted in explicitly (the default is false); without an opt-in
  // no consent row is ever created.
  if (parsed.data.marketingConsent) {
    try {
      await captureChatEntryConsent({
        store: createContactConsentStore(getChatPool()),
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        now,
      });
    } catch {
      // Fixed code only: never log the submitted contact data.
      logChatServerEvent("chat_consent_error");
    }
  }

  const response = chatJsonResponse({
    success: true,
    data: {
      conversation: toVisitorConversationView({
        id: conversationId,
        status: "open",
        visitorName: parsed.data.name,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: null,
      }),
    },
  });

  response.cookies.set({
    ...visitorSessionCookieOptions({
      ttlSeconds,
      secure: process.env.NODE_ENV === "production",
    }),
    value: buildVisitorSessionCookieValue(material.secret, signingKeys),
  });

  return response;
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

  try {
    const conversation = await createVisitorConversationStore(
      getChatPool()
    ).findConversationById(session.conversationId);
    if (conversation === null) return chatNotFoundResponse();
    return chatJsonResponse({
      success: true,
      data: { conversation: toVisitorConversationView(conversation) },
    });
  } catch {
    logChatServerEvent("chat_db_error");
    return chatUnavailableResponse();
  }
}
