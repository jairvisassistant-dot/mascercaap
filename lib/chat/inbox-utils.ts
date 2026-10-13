import { CHAT_MESSAGE_BODY_MAX_LENGTH } from "@/lib/chat/types";

/**
 * Pure decision helpers for the coordinator inbox.
 *
 * They live outside the component so `InboxClient.tsx` only exports components
 * (which keeps Fast Refresh able to preserve its state) and so the operator
 * view-state, push-capability and metrics-window rules can be unit-tested
 * without a DOM.
 */

/** Inbox tabs: the workspace and the aggregate operations report. */
export type InboxViewKind = "loading" | "empty" | "error" | "denied" | "ready";

/** Resolves the safe top-level inbox state, denied taking precedence. */
export function resolveInboxViewState(input: {
  readonly loading: boolean;
  readonly denied: boolean;
  readonly error: boolean;
  readonly conversationCount: number;
}): { readonly kind: InboxViewKind } {
  if (input.denied) return { kind: "denied" };
  if (input.loading) return { kind: "loading" };
  if (input.error) return { kind: "error" };
  if (input.conversationCount === 0) return { kind: "empty" };
  return { kind: "ready" };
}

/** Bounded reply validation; returns a stable error code or `null`. */
export function computeReplyError(raw: string): "reply_required" | "reply_too_long" | null {
  const value = raw.trim();
  if (value.length === 0) return "reply_required";
  if (raw.length > CHAT_MESSAGE_BODY_MAX_LENGTH) return "reply_too_long";
  return null;
}

/**
 * The send/close gate: a classification is mandatory, and a physical purge also
 * requires the explicit destructive confirmation checkbox to be ticked.
 */
export function resolveCloseConfirmation(input: {
  readonly closeResult: string;
  readonly purge: boolean;
  readonly confirmPurge: boolean;
}): boolean {
  if (input.closeResult === "") return false;
  if (!input.purge) return true;
  return input.confirmPurge === true;
}

export const CHAT_SSE_RETRY_BASE_MS = 3_000;
export const CHAT_SSE_RETRY_MAX_MS = 30_000;

/** Bounded exponential backoff for coordinator EventSource reconnection. */
export function nextInboxReconnectDelayMs(attempt: number): number {
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
  const exponent = Math.min(safeAttempt, 4);
  return Math.min(CHAT_SSE_RETRY_MAX_MS, CHAT_SSE_RETRY_BASE_MS * 2 ** exponent);
}

/**
 * Fallback polling runs only on a visible page while SSE is unavailable;
 * otherwise the coordinator relies on the opaque wake-up plus refetch.
 */
export function shouldPollInbox(input: {
  readonly sseConnected: boolean;
  readonly pageVisible: boolean;
}): boolean {
  return input.pageVisible && !input.sseConnected;
}

/**
 * A periodic recovery refetch runs on a visible page even when SSE is healthy:
 * "a subscribed socket is not proof that every ephemeral signal arrived".
 */
export function shouldRecoverInbox(input: { readonly pageVisible: boolean }): boolean {
  return input.pageVisible;
}

/* ── Push notifications (opt-in) ──────────────────────────────────── */

/**
 * True when this browser can hold a push subscription at all: the Push API,
 * the Notifications API and service workers must all exist. Server-side
 * support (a configured public VAPID key) is checked separately.
 */
export function isPushOptInSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Converts a base64url VAPID public key into the Uint8Array the API expects. */
export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

/**
 * Maps a browser permission state to the inbox UI state. Anything other than
 * a definitive grant is simply "not subscribed" — never a blocking prompt.
 */
export function resolvePushUiState(input: {
  readonly supported: boolean;
  readonly serverKeyConfigured: boolean;
  readonly permission: NotificationPermission | null;
  readonly subscribed: boolean;
}): "hidden" | "off" | "on" | "blocked" {
  if (!input.supported || !input.serverKeyConfigured) return "hidden";
  if (input.permission === "denied") return "blocked";
  return input.subscribed ? "on" : "off";
}

/* ── Operations report formatting ─────────────────────────────────── */

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function toUtcDateKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;
}

/**
 * Inclusive UTC report window ending on `todayIso`. Kept pure so the client
 * never depends on the browser timezone: the API buckets in UTC as well.
 */
export function resolveMetricsWindow(input: {
  readonly presetDays: number;
  readonly todayIso: string;
}): { readonly from: string; readonly to: string } {
  const todayMs = Date.parse(`${input.todayIso}T00:00:00.000Z`);
  const days = Number.isInteger(input.presetDays) && input.presetDays > 0 ? input.presetDays : 7;
  const fromMs = todayMs - (days - 1) * 86_400_000;
  return { from: toUtcDateKey(fromMs), to: input.todayIso };
}

/** Compact duration for latency columns (`450 s`, `5 min`, `12 h 15 min`). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Percentage for a success rate; `—` while there is no denominator. */
export function formatRate(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)} %`;
}
