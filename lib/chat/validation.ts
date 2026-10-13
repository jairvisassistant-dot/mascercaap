/**
 * Chat request validation schemas (Zod) and opaque cursor codec.
 *
 * Pure module: no `server-only`, no database, no Next.js imports, so the same
 * schemas can validate on the server route and drive client-side form feedback
 * without leaking a server dependency into the browser bundle.
 *
 * Rules enforced here (Criterios-Chat.md section 8.6 and schema widths):
 * - visitor name 2..60, valid email <= 320, optional phone <= 32;
 * - message body 1..1000, operator close note <= 500;
 * - plain text only: control characters are rejected (tab/newline/carriage
 *   return allowed) so a body can never smuggle terminal control sequences;
 * - unknown fields are rejected (`.strict()`), which closes the identity/role
 *   spoofing surface on every payload;
 * - commercial consent is optional and defaults to `false`.
 */

import { z } from "zod";

import {
  CHAT_CLOSE_NOTE_MAX_LENGTH,
  CHAT_CLOSE_RESULTS,
  CHAT_CURSOR_MAX_LENGTH,
  CHAT_MESSAGE_BODY_MAX_LENGTH,
  CHAT_MESSAGE_BODY_MIN_LENGTH,
  CHAT_VISITOR_EMAIL_MAX_LENGTH,
  CHAT_VISITOR_NAME_MAX_LENGTH,
  CHAT_VISITOR_NAME_MIN_LENGTH,
  CHAT_VISITOR_PHONE_MAX_LENGTH,
  type ChatCursorValue,
} from "./types";

/** Rejects C0/C1 control characters, allowing tab, newline and carriage return. */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** True when the string has no control characters (tab/newline/CR allowed). */
export function isPlainText(value: string): boolean {
  return !CONTROL_CHARACTERS.test(value);
}

/** Permissive but bounded phone shape; the field itself is optional. */
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]*$/;

const phoneField = z
  .string()
  .trim()
  .max(CHAT_VISITOR_PHONE_MAX_LENGTH)
  .refine((value) => value === "" || PHONE_PATTERN.test(value), {
    message: "invalid phone number",
  })
  .optional()
  .transform((value) => (value === undefined || value === "" ? undefined : value));

const nameField = z
  .string()
  .trim()
  .min(CHAT_VISITOR_NAME_MIN_LENGTH)
  .max(CHAT_VISITOR_NAME_MAX_LENGTH)
  .refine(isPlainText);

const emailField = z
  .string()
  .trim()
  .min(1)
  .max(CHAT_VISITOR_EMAIL_MAX_LENGTH)
  .email();

const messageBodyField = z
  .string()
  .trim()
  .min(CHAT_MESSAGE_BODY_MIN_LENGTH)
  .max(CHAT_MESSAGE_BODY_MAX_LENGTH)
  .refine(isPlainText);

/** Random opaque idempotency key; base64url alphabet, bounded length. */
const clientMessageIdField = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,191}$/, "invalid client message id");

/** Visitor chat entry form. */
export const chatEntrySchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    marketingConsent: z.boolean().default(false),
  })
  .strict();

/** Visitor client message. */
export const clientMessageSchema = z
  .object({
    body: messageBodyField,
    clientMessageId: clientMessageIdField,
  })
  .strict();

/** Operator reply. Identity is derived server-side, never from this payload. */
export const operatorReplySchema = z
  .object({
    body: messageBodyField,
    clientMessageId: clientMessageIdField,
  })
  .strict();

/** Operator close. Requires an outcome classification; purge is opt-in. */
export const operatorCloseSchema = z
  .object({
    closeResult: z.enum(CHAT_CLOSE_RESULTS),
    closeNote: z
      .string()
      .trim()
      .max(CHAT_CLOSE_NOTE_MAX_LENGTH)
      .refine(isPlainText)
      .optional(),
    purge: z.boolean().default(false),
  })
  .strict();

/** Decoded wire shape of an opaque cursor. */
const chatCursorSchema = z
  .object({
    t: z.string().min(1).max(64),
    i: z.string().min(1).max(191),
  })
  .strict();

/**
 * Encodes the composite `(created_at, id)` cursor as an opaque base64url string.
 * The encoding is obfuscation + a stability contract, not a security boundary:
 * authorization always comes from the visitor session or operator session.
 */
export function encodeChatCursor(cursor: ChatCursorValue): string {
  const json = JSON.stringify({ t: cursor.createdAt, i: cursor.id });
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * Decodes an opaque cursor. Returns `null` for any malformed, over-long or
 * unknown-shaped input and never throws on attacker-controlled data.
 */
export function decodeChatCursor(raw: string | null | undefined): ChatCursorValue | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > CHAT_CURSOR_MAX_LENGTH) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const result = chatCursorSchema.safeParse(parsed);
  if (!result.success) return null;
  return { createdAt: result.data.t, id: result.data.i };
}
