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
  chatJsonResponse,
  chatUnavailableResponse,
  readBoundedJsonBody,
} from "@/lib/chat/http";
import {
  getOperatorIdentity,
  requireOperatorAuth,
} from "@/lib/chat/operator-auth";
import {
  createPushSubscriptionStore,
  newPushSubscriptionId,
  resolveVapidConfig,
} from "@/lib/chat/push";

/**
 * Coordinator Web Push subscription management.
 *
 * - `GET` returns only the public VAPID key so the browser can register a
 *   service worker; the private key never leaves the server.
 * - `POST` upserts one subscription for the server-derived operator identity.
 *   The endpoint and key material are accepted here and never echoed back.
 * - `DELETE` removes an endpoint scoped to the operator and answers
 *   identically whether or not it existed — no existence oracle.
 *
 * Every response carries `Cache-Control: no-store`, and malformed bodies map
 * to a generic 400 without echoing any field.
 */

const pushSubscriptionSchema = z.strictObject({
  endpoint: z
    .string()
    .min(1)
    .max(2048)
    .refine((value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "endpoint must be an https URL"),
  keys: z.strictObject({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
});

const removeSubscriptionSchema = z.strictObject({
  endpoint: z
    .string()
    .min(1)
    .max(2048)
    .refine((value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "endpoint must be an https URL"),
});

/** GET is an authenticated safe read: browsers omit `Origin` on same-origin GET. */
export async function GET(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled || !chatConfig.push) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env, {
    allowAbsentOrigin: true,
  });
  if (originError) return originError;

  const authError = await requireOperatorAuth(request);
  if (authError) return chatErrorResponseJson(authError.status);

  // Only the public half of the VAPID pair is ever returned; unconfigured
  // deployments report an empty key and the client hides the opt-in UI.
  const vapid = resolveVapidConfig(process.env);
  return chatJsonResponse({ success: true, data: { publicKey: vapid?.publicKey ?? "" } });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled || !chatConfig.push) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env);
  if (originError) return originError;

  const authError = await requireOperatorAuth(request);
  if (authError) return chatErrorResponseJson(authError.status);

  const identity = getOperatorIdentity();
  if (identity === null) return chatUnavailableResponse();

  // Fail closed while VAPID is unconfigured: storing a subscription that can
  // never be delivered would silently swallow notifications.
  if (resolveVapidConfig(process.env) === null) return chatUnavailableResponse();

  const body = await readBoundedJsonBody(request);
  if (!body.ok) return chatBoundedBodyErrorResponse(body.reason);

  const parsed = pushSubscriptionSchema.safeParse(body.data);
  if (!parsed.success) return chatErrorResponseJson(400);

  try {
    const store = createPushSubscriptionStore(getChatPool());
    await store.upsert({
      id: newPushSubscriptionId(),
      operatorId: identity.operatorId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      now: new Date(),
    });
    // Generic body: never echoes the endpoint or any key material.
    return chatJsonResponse({ success: true, data: {} });
  } catch {
    return chatUnavailableResponse();
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!chatConfig.enabled || !chatConfig.push) return chatDisabledResponse();

  const originError = assertChatRequestOrigin(request, process.env);
  if (originError) return originError;

  const authError = await requireOperatorAuth(request);
  if (authError) return chatErrorResponseJson(authError.status);

  const identity = getOperatorIdentity();
  if (identity === null) return chatUnavailableResponse();

  const body = await readBoundedJsonBody(request);
  if (!body.ok) return chatBoundedBodyErrorResponse(body.reason);

  const parsed = removeSubscriptionSchema.safeParse(body.data);
  if (!parsed.success) return chatErrorResponseJson(400);

  try {
    const store = createPushSubscriptionStore(getChatPool());
    await store.deleteByOperatorEndpoint({
      operatorId: identity.operatorId,
      endpoint: parsed.data.endpoint,
    });
    // Identical response whether or not the endpoint existed.
    return chatJsonResponse({ success: true, data: {} });
  } catch {
    return chatUnavailableResponse();
  }
}
