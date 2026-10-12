import "server-only";

import { createHash } from "node:crypto";

/**
 * Server-only in-process SSE signal hub.
 *
 * This is the wake-up transport for the live chat, not a delivery channel. The
 * hub holds one in-process registry of open subscriptions and fans out an
 * OPAQUE `conversation_changed` notification whenever a conversation changes.
 * Opening a socket is never treated as proof of delivery: a client that receives
 * the signal (or reconnects after missing it) always re-reads authorized state
 * from the existing API routes.
 *
 * Hard invariants:
 * - **Opaque signals only.** The internal scope (a raw conversation id, or the
 *   coordinator channel) is used solely as an in-process routing key. It is
 *   never serialized: the wire event carries no body, name, email, phone, id or
 *   token. {@link formatChatSseChanged} is the only changed-event framing.
 * - **Persist before notify.** {@link publishConversationChanged} must be called
 *   only after the related database transaction has committed. A signal emitted
 *   before commit could make a client refetch and observe stale state.
 * - **No content is stored here.** Subscriptions keep a listener closure and key
 *   counts only; no message, identity or conversation data is retained.
 * - **In-process, one process.** State lives in the Node process. On restart all
 *   streams drop, every `EventSource` reconnects, and clients re-fetch authorized
 *   state. This module assumes the single-process deployment verified for
 *   Hostinger and makes no cross-process guarantee.
 * - **Bounded.** Per-key and total connection caps, a heartbeat cadence and a
 *   bounded maximum stream duration keep listeners from leaking.
 * - **PII-free metrics.** Identity and IP reach the hub only as SHA-256 hashes,
 *   so counters (open, opened, closed, rejected, publishes, heartbeats,
 *   expirations) never carry personal data.
 */

/** Wire event name for an opaque conversation-changed wake-up. */
export const CHAT_SSE_CHANGED_EVENT = "conversation_changed" as const;

/**
 * Internal routing scope for coordinator streams. Every conversation change is
 * also delivered here; the constant is never emitted on the wire and can never
 * collide with a conversation UUID.
 */
export const CHAT_OPERATOR_SIGNAL_SCOPE = "operator-chat" as const;

export const CHAT_SSE_CONTENT_TYPE = "text/event-stream; charset=utf-8";

/** Reconnect delay hint advertised to `EventSource` (`retry:` field). */
export const CHAT_SSE_RETRY_MS = 3_000;

/** Heartbeat cadence; comment-only frames keep intermediaries from idling out. */
export const CHAT_SSE_HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Maximum lifetime of one stream. Hostinger stability was verified at 120 s, so
 * the stream closes gracefully and lets the client reconnect instead of holding
 * a listener open forever.
 */
export const CHAT_SSE_MAX_DURATION_MS = 120_000;

/** Maximum concurrent streams per hashed session/operator identity. */
export const CHAT_SSE_MAX_PER_SESSION = 3;

/** Maximum concurrent streams per hashed client IP (shared NATs included). */
export const CHAT_SSE_MAX_PER_IP = 20;

/** Maximum concurrent streams across the whole process. */
export const CHAT_SSE_MAX_TOTAL = 200;

/** `Retry-After` (seconds) advertised when a stream is rejected by a cap. */
export const CHAT_SSE_REJECT_RETRY_AFTER_SECONDS = 5;

/** A hashed connection key plus its concurrency ceiling. */
export type ChatStreamKeyLimit = {
  readonly key: string;
  readonly max: number;
};

/** SHA-256 hex digest used to key caps and metrics without storing PII. */
export function hashChatStreamKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/* ── Wire framing ─────────────────────────────────────────────────── */

/** `retry:` preamble sent once on connect. */
export function formatChatSseRetry(retryMs: number = CHAT_SSE_RETRY_MS): string {
  const bounded =
    Number.isFinite(retryMs) && retryMs > 0 ? Math.floor(retryMs) : CHAT_SSE_RETRY_MS;
  return `retry: ${bounded}\n\n`;
}

/** Comment-only heartbeat frame; it never dispatches a client event. */
export function formatChatSseHeartbeat(): string {
  return ": heartbeat\n\n";
}

/**
 * The single changed-event frame. The named event has an explicit empty `data`
 * line so browsers dispatch it (SSE drops an event with no data line) while the
 * payload stays empty and opaque.
 */
export function formatChatSseChanged(): string {
  return `event: ${CHAT_SSE_CHANGED_EVENT}\ndata:\n\n`;
}

/**
 * Response headers that prevent buffering and caching end to end:
 * `no-store`/`no-transform` stop intermediaries from caching or rewriting the
 * body, and `X-Accel-Buffering: no` disables proxy buffering (nginx and
 * compatible front ends).
 */
export function chatSseHeaders(): Record<string, string> {
  return {
    "Content-Type": CHAT_SSE_CONTENT_TYPE,
    "Cache-Control": "no-store, no-cache, must-revalidate, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  };
}

/* ── Hub ──────────────────────────────────────────────────────────── */

export type ChatSignalListener = () => void;

/** A live subscription. `close` is idempotent. */
export interface ChatSignalSubscription {
  readonly scope: string;
  /** Registers the sink invoked on each delivered signal (replaces any prior). */
  listen(listener: ChatSignalListener): void;
  /** Records one heartbeat write for metrics. */
  recordHeartbeat(): void;
  /** Records a bounded-duration close for metrics. */
  recordExpiration(): void;
  close(): void;
}

export interface ChatSubscribeInput {
  readonly scope: string;
  readonly keys: readonly ChatStreamKeyLimit[];
  readonly maxTotal?: number;
}

export type ChatSubscribeResult =
  | { readonly ok: true; readonly subscription: ChatSignalSubscription }
  | {
      readonly ok: false;
      readonly reason: "connection_limit";
      readonly retryAfterSeconds: number;
    };

export type ChatSignalMetrics = {
  readonly openConnections: number;
  readonly openedTotal: number;
  readonly closedTotal: number;
  readonly rejectedTotal: number;
  readonly publishesTotal: number;
  readonly heartbeatsTotal: number;
  readonly expirationsTotal: number;
};

export interface ChatSignalHub {
  /** Registers a subscription, or rejects it when a cap is exhausted. */
  subscribe(input: ChatSubscribeInput): ChatSubscribeResult;
  /**
   * Delivers an opaque wake-up. `scope` is the internal conversation id (or the
   * coordinator scope); it is used only for routing and never emitted.
   */
  publish(scope: string): void;
  /** PII-free operational counters. */
  metrics(): ChatSignalMetrics;
  /** Current open subscription count. */
  size(): number;
}

type InternalSubscription = ChatSignalSubscription & {
  readonly keys: readonly string[];
  /** Invoked by `publish`; internal, never exposed to routes. */
  deliver(): void;
};

/** Builds an isolated hub. Production uses the {@link getChatSignalHub} singleton. */
export function createChatSignalHub(): ChatSignalHub {
  const byScope = new Map<string, Set<InternalSubscription>>();
  const countsByKey = new Map<string, number>();

  let openConnections = 0;
  let openedTotal = 0;
  let closedTotal = 0;
  let rejectedTotal = 0;
  let publishesTotal = 0;
  let heartbeatsTotal = 0;
  let expirationsTotal = 0;

  function detach(subscription: InternalSubscription): void {
    const scopeSet = byScope.get(subscription.scope);
    if (scopeSet !== undefined) {
      scopeSet.delete(subscription);
      if (scopeSet.size === 0) byScope.delete(subscription.scope);
    }
    for (const key of subscription.keys) {
      const current = countsByKey.get(key) ?? 0;
      if (current <= 1) countsByKey.delete(key);
      else countsByKey.set(key, current - 1);
    }
    openConnections = Math.max(0, openConnections - 1);
    closedTotal += 1;
  }

  function deliverTo(scope: string): void {
    const scopeSet = byScope.get(scope);
    if (scopeSet === undefined) return;
    for (const subscription of [...scopeSet]) subscription.deliver();
  }

  return {
    subscribe(input) {
      const maxTotal = input.maxTotal ?? CHAT_SSE_MAX_TOTAL;
      if (openConnections >= maxTotal) {
        rejectedTotal += 1;
        return {
          ok: false,
          reason: "connection_limit",
          retryAfterSeconds: CHAT_SSE_REJECT_RETRY_AFTER_SECONDS,
        };
      }
      for (const limit of input.keys) {
        if ((countsByKey.get(limit.key) ?? 0) >= limit.max) {
          rejectedTotal += 1;
          return {
            ok: false,
            reason: "connection_limit",
            retryAfterSeconds: CHAT_SSE_REJECT_RETRY_AFTER_SECONDS,
          };
        }
      }

      let listener: ChatSignalListener | null = null;
      let isOpen = true;
      const keys = input.keys.map((limit) => limit.key);

      const subscription: InternalSubscription = {
        scope: input.scope,
        keys,
        listen(next) {
          listener = next;
        },
        recordHeartbeat() {
          heartbeatsTotal += 1;
        },
        recordExpiration() {
          expirationsTotal += 1;
        },
        deliver() {
          if (!isOpen || listener === null) return;
          try {
            listener();
          } catch {
            // A broken listener must never interrupt fan-out to other streams.
          }
        },
        close() {
          if (!isOpen) return;
          isOpen = false;
          listener = null;
          detach(subscription);
        },
      };

      let scopeSet = byScope.get(input.scope);
      if (scopeSet === undefined) {
        scopeSet = new Set();
        byScope.set(input.scope, scopeSet);
      }
      scopeSet.add(subscription);
      for (const key of keys) countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
      openConnections += 1;
      openedTotal += 1;

      return { ok: true, subscription };
    },

    publish(scope) {
      publishesTotal += 1;
      deliverTo(scope);
      if (scope !== CHAT_OPERATOR_SIGNAL_SCOPE) deliverTo(CHAT_OPERATOR_SIGNAL_SCOPE);
    },

    metrics() {
      return Object.freeze({
        openConnections,
        openedTotal,
        closedTotal,
        rejectedTotal,
        publishesTotal,
        heartbeatsTotal,
        expirationsTotal,
      });
    },

    size() {
      return openConnections;
    },
  };
}

let singletonHub: ChatSignalHub | null = null;

/** Process-wide hub shared by the visitor and operator stream routes. */
export function getChatSignalHub(): ChatSignalHub {
  if (singletonHub === null) singletonHub = createChatSignalHub();
  return singletonHub;
}

/**
 * Drops the process-wide hub. Intended for tests and restart verification only;
 * it closes nothing, so in-flight routes still finish against their captured
 * hub reference.
 */
export function resetChatSignalHub(): void {
  singletonHub = null;
}

/**
 * Signals that one conversation changed. Call this **only after** the database
 * transaction that produced the change has committed: the notification fans out
 * to that conversation's visitor stream and to every coordinator stream, and
 * each client then re-reads authorized state.
 */
export function publishConversationChanged(conversationId: string): void {
  getChatSignalHub().publish(conversationId);
}

/* ── Response / stream lifecycle ──────────────────────────────────── */

export type ChatSseStreamOptions = {
  readonly heartbeatIntervalMs?: number;
  readonly maxDurationMs?: number;
  readonly retryMs?: number;
};

/**
 * Wraps a subscription in an SSE `Response`.
 *
 * Lifecycle is fully owned here: it writes the `retry:` preamble, a heartbeat
 * every {@link CHAT_SSE_HEARTBEAT_INTERVAL_MS}, forwards opaque changed events,
 * closes after {@link CHAT_SSE_MAX_DURATION_MS}, and releases the subscription
 * and timers on client cancel or `AbortSignal` abort. Every path is idempotent.
 */
export function buildChatSseResponse(
  subscription: ChatSignalSubscription,
  signal?: AbortSignal,
  options: ChatSseStreamOptions = {}
): Response {
  const encoder = new TextEncoder();
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? CHAT_SSE_HEARTBEAT_INTERVAL_MS;
  const maxDurationMs = options.maxDurationMs ?? CHAT_SSE_MAX_DURATION_MS;
  const retryMs = options.retryMs ?? CHAT_SSE_RETRY_MS;

  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function write(chunk: string): void {
    if (closed || controllerRef === null) return;
    try {
      controllerRef.enqueue(encoder.encode(chunk));
    } catch {
      cleanup();
    }
  }

  function cleanup(): void {
    if (closed) return;
    closed = true;
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (expiryTimer !== null) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
    if (signal !== undefined) signal.removeEventListener("abort", onAbort);
    subscription.close();
    try {
      controllerRef?.close();
    } catch {
      // Already closed or cancelled by the consumer.
    }
  }

  function onAbort(): void {
    cleanup();
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      subscription.listen(() => write(formatChatSseChanged()));
      write(formatChatSseRetry(retryMs));

      heartbeatTimer = setInterval(() => {
        subscription.recordHeartbeat();
        write(formatChatSseHeartbeat());
      }, heartbeatIntervalMs);

      expiryTimer = setTimeout(() => {
        subscription.recordExpiration();
        cleanup();
      }, maxDurationMs);

      if (signal !== undefined) {
        if (signal.aborted) cleanup();
        else signal.addEventListener("abort", onAbort, { once: true });
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { status: 200, headers: chatSseHeaders() });
}
