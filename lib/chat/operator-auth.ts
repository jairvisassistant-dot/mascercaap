import "server-only";

import { NextResponse } from "next/server";

import { requireAdminAuth } from "@/lib/admin/auth";

import { chatErrorResponse, type OperatorReplyInput } from "./types";

/**
 * Server-only operator authorization helper.
 *
 * The coordinator inbox reuses the existing Supabase admin/MFA boundary. This
 * module never derives identity, role or sender from a request payload: it calls
 * `requireAdminAuth` (which already validates the admin cookie, MFA-backed
 * session and the configured `ADMIN_EMAIL`) and only then exposes a
 * server-derived identity built from `ADMIN_EMAIL`.
 *
 * Every operator mutation is expected to run through these builders, so a
 * request body can never claim to be the operator, a bot or a visitor.
 */

/** Sender type stamped on every operator-authored message by the server. */
export const OPERATOR_SENDER_TYPE = "operator" as const;

/** Server-derived operator identity. Never built from request data. */
export type OperatorIdentity = {
  readonly operatorId: string;
  readonly senderType: typeof OPERATOR_SENDER_TYPE;
};

/** Canonical operator message command produced server-side. */
export type OperatorMessageCommand = {
  readonly conversationId: string;
  readonly senderType: typeof OPERATOR_SENDER_TYPE;
  readonly senderName: string;
  readonly body: string;
  readonly clientMessageId: string;
};

/**
 * Builds the operator identity from an environment map. Only `ADMIN_EMAIL` is
 * read; any `operatorId`/`senderType` key in the same map is ignored.
 */
export function resolveOperatorIdentityFromEnv(env: {
  readonly [key: string]: string | undefined;
}): OperatorIdentity | null {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return null;
  return Object.freeze({
    operatorId: adminEmail,
    senderType: OPERATOR_SENDER_TYPE,
  });
}

/** Reads the operator identity from the process environment (server-only). */
export function getOperatorIdentity(): OperatorIdentity | null {
  return resolveOperatorIdentityFromEnv(process.env);
}

/**
 * Guards an operator route. Returns `null` when authorized, or a generic,
 * non-enumerating error response that preserves the admin boundary's status.
 */
export async function requireOperatorAuth(req: Request): Promise<NextResponse | null> {
  const authError = await requireAdminAuth(req);
  if (authError) {
    return NextResponse.json(chatErrorResponse(), { status: authError.status });
  }
  return null;
}

/**
 * Builds the canonical operator message command. The sender identity and sender
 * type always come from the server-derived `identity`; any identity-shaped field
 * present on the validated reply object is ignored.
 */
export function buildOperatorMessageCommand(
  conversationId: string,
  reply: OperatorReplyInput,
  identity: OperatorIdentity
): OperatorMessageCommand {
  return {
    conversationId,
    senderType: OPERATOR_SENDER_TYPE,
    senderName: identity.operatorId,
    body: reply.body,
    clientMessageId: reply.clientMessageId,
  };
}
