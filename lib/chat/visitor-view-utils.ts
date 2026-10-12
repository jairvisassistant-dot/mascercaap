import type { ChatSenderType } from "@/lib/chat/types";
import { chatEntrySchema } from "@/lib/chat/validation";

/**
 * Pure helpers and view models for the visitor chat view.
 *
 * Extracted from `ChatView.tsx` so that file only exports components — a mixed
 * module silently disables Fast Refresh, which costs every state-preserving
 * hot reload while working on the drawer. The behavioural rules (composer
 * keyboard semantics, entry validation, thread reconciliation, idempotency
 * keys, reconnect backoff) stay testable without a DOM.
 */

export type ChatEntryValues = {
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
};

export type ChatEntryField = keyof ChatEntryValues;
export type ChatEntryErrors = Partial<Record<"name" | "email" | "phone", string>>;

export type ChatThreadMessage = {
  id: string;
  senderType: ChatSenderType;
  body: string;
  createdAt: string;
};

export type ChatPendingMessage = {
  clientMessageId: string;
  body: string;
  failed: boolean;
};

export const CHAT_SSE_RETRY_BASE_MS = 3_000;
export const CHAT_SSE_RETRY_MAX_MS = 30_000;

/** Resolves the Enter/Shift+Enter semantics, honouring active IME composition. */
export function resolveComposerKeyAction(input: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
}): "send" | "newline" {
  if (input.isComposing) return "newline";
  if (input.key === "Enter" && !input.shiftKey) return "send";
  return "newline";
}

/**
 * Generates a random idempotency key accepted by the message schema
 * (`[A-Za-z0-9_-]{8,191}`). Uses the platform UUID when available.
 */
export function newClientMessageId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Client mirror of the server entry schema, mapped to per-field messages. */
export function computeEntryErrors(
  values: Pick<ChatEntryValues, "name" | "email" | "phone">
): ChatEntryErrors {
  const parsed = chatEntrySchema.safeParse({
    name: values.name,
    email: values.email,
    phone: values.phone.trim() === "" ? undefined : values.phone,
    marketingConsent: false,
  });
  if (parsed.success) return {};

  const errors: ChatEntryErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if ((field === "name" || field === "email" || field === "phone") && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/** Deduplicates messages by id and keeps a stable chronological order. */
export function mergeThreadMessages(
  existing: readonly ChatThreadMessage[],
  incoming: readonly ChatThreadMessage[]
): ChatThreadMessage[] {
  const byId = new Map<string, ChatThreadMessage>();
  for (const message of existing) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
}

/**
 * Bounded exponential backoff for EventSource reconnection attempts. The native
 * `retry:` hint covers the first retry; this drives our explicit reconnect so a
 * broken stream cannot spin in a tight loop.
 */
export function nextChatReconnectDelayMs(attempt: number): number {
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
  const exponent = Math.min(safeAttempt, 4);
  return Math.min(CHAT_SSE_RETRY_MAX_MS, CHAT_SSE_RETRY_BASE_MS * 2 ** exponent);
}

/**
 * The visitor history poll is a fallback only: it runs on a visible page while
 * the SSE stream is not connected. A healthy SSE stream already triggers an
 * immediate refetch on every wake-up.
 */
export function shouldPollVisitorHistory(input: {
  readonly sseConnected: boolean;
  readonly pageVisible: boolean;
}): boolean {
  return input.pageVisible && !input.sseConnected;
}
