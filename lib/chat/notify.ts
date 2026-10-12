import "server-only";

import type { Pool, RowDataPacket } from "mysql2/promise";

import { createEmailOutboxStore, newEmailOutboxId, resumeEmailIdempotencyKey, type EmailOutboxStore } from "./email-outbox";
import {
  createPushSubscriptionStore,
  createWebPushTransport,
  resolveVapidConfig,
  sendOperatorPushes,
  type PushSubscriptionStore,
  type PushTransport,
  type VapidConfig,
} from "./push";
import { publishConversationChanged } from "./realtime";

/**
 * Post-commit notification orchestrator (Criterios-Chat.md sections 6, 8, 9
 * and 11).
 *
 * Hard invariants:
 * - **Persist before notify.** Callers invoke these helpers only after the
 *   message row is committed. A notification failure never undoes or delays
 *   the committed message.
 * - **Publish first, then push/email.** The opaque SSE signal
 *   (`publishConversationChanged`) is emitted before any push transport call
 *   or outbox enqueue.
 * - **Never throws.** Every failure is isolated and reported as counts; the
 *   request path always succeeds once the message is stored.
 * - **Privacy.** The push payload is exactly `{"unreadCount":<n>}`; the email
 *   outbox stores ids and status only. Nothing personal crosses either path.
 * - **Presence is a fresh lease, not an open socket.** A visitor counts as
 *   present only when a `visitor_chat_sessions` row has a `last_seen_at`
 *   within {@link CHAT_VISITOR_PRESENCE_TTL_SECONDS} and is neither revoked
 *   nor expired. An open SSE stream alone is never presence.
 */

/**
 * Presence lease freshness window (module constant — no new environment
 * variable, per the Phase 6 constraint). A visitor seen within the last 5
 * minutes is considered present and does not need a resume email.
 */
export const CHAT_VISITOR_PRESENCE_TTL_SECONDS = 300;

/* ── Ports ────────────────────────────────────────────────────────── */

export type PresenceStore = {
  countFreshSessions(input: {
    readonly conversationId: string;
    readonly now: Date;
    readonly freshBefore: Date;
  }): Promise<number>;
};

export type UnreadStore = {
  countUnreadForOperator(operatorId: string): Promise<number>;
};

export type NotifyDeps = {
  // `publish` stays mutable: route tests replace it to observe call order.
  publish: (conversationId: string) => void;
  readonly transport: PushTransport;  readonly pushStore: Pick<PushSubscriptionStore, "listByOperator" | "deleteByEndpoint">;
  readonly outboxStore: Pick<EmailOutboxStore, "enqueue">;
  readonly presenceStore: PresenceStore;
  readonly unreadStore: UnreadStore;
  readonly operatorId: string;
};

/* ── Presence ─────────────────────────────────────────────────────── */

/**
 * True only for a fresh, unrevoked, unexpired session lease. Errors fail
 * closed (absent), so a database hiccup can suppress an email but never
 * sends one wrongly.
 */
export async function isVisitorPresent(input: {
  readonly store: Pick<PresenceStore, "countFreshSessions">;
  readonly conversationId: string;
  readonly now: Date;
}): Promise<boolean> {
  try {
    const count = await input.store.countFreshSessions({
      conversationId: input.conversationId,
      now: input.now,
      freshBefore: new Date(input.now.getTime() - CHAT_VISITOR_PRESENCE_TTL_SECONDS * 1000),
    });
    return count > 0;
  } catch {
    return false;
  }
}

/* ── Visitor message → coordinator push ───────────────────────────── */

export type OperatorNotifyOutcome = {
  readonly published: boolean;
  readonly delivered: number;
  readonly failed: number;
  readonly removed: number;
};

const ZERO_PUSH_OUTCOME: OperatorNotifyOutcome = Object.freeze({
  published: false,
  delivered: 0,
  failed: 0,
  removed: 0,
});

/**
 * Notifies the coordinator of a committed visitor message: publishes the
 * opaque SSE signal first, then (only when push is enabled) derives the
 * aggregate unread count and fans out one `{"unreadCount":<n>}` push per
 * subscription. Never throws.
 */
export async function notifyOperatorOfVisitorMessage(input: {
  readonly conversationId: string;
  readonly now: Date;
  readonly pushEnabled: boolean;
  readonly deps: NotifyDeps;
}): Promise<OperatorNotifyOutcome> {
  let published = false;
  try {
    input.deps.publish(input.conversationId);
    published = true;
  } catch {
    // SSE hub down: the push path below still runs; the inbox refetches later.
  }

  if (!input.pushEnabled) {
    return { ...ZERO_PUSH_OUTCOME, published };
  }

  let unreadCount: number;
  try {
    unreadCount = await input.deps.unreadStore.countUnreadForOperator(input.deps.operatorId);
  } catch {
    // Without a trustworthy aggregate there is nothing safe to push.
    return { ...ZERO_PUSH_OUTCOME, published };
  }

  try {
    const subscriptions = await input.deps.pushStore.listByOperator(input.deps.operatorId);
    const report = await sendOperatorPushes({
      subscriptions,
      unreadCount,
      transport: input.deps.transport,
      removeGone: (endpoint: string) => input.deps.pushStore.deleteByEndpoint(endpoint),
    });
    return Object.freeze({
      published,
      delivered: report.delivered,
      failed: report.failed,
      removed: report.removed,
    });
  } catch {
    return { ...ZERO_PUSH_OUTCOME, published };
  }
}

/* ── Operator reply → resume email outbox ─────────────────────────── */

export type VisitorNotifyOutcome = {
  readonly published: boolean;
  readonly emailQueued: boolean;
};

/**
 * Handles a committed operator reply: publishes the opaque SSE signal first,
 * then enqueues an idempotent resume email — but only when email is enabled
 * and the visitor holds no fresh presence lease. Never throws.
 */
export async function notifyVisitorOfOperatorReply(input: {
  readonly conversationId: string;
  readonly messageId: string;
  readonly now: Date;
  readonly emailEnabled: boolean;
  readonly deps: NotifyDeps;
}): Promise<VisitorNotifyOutcome> {
  let published = false;
  try {
    input.deps.publish(input.conversationId);
    published = true;
  } catch {
    // SSE hub down: the outbox below still runs; the visitor refetches later.
  }

  if (!input.emailEnabled) {
    return { published, emailQueued: false };
  }

  const present = await isVisitorPresent({
    store: input.deps.presenceStore,
    conversationId: input.conversationId,
    now: input.now,
  });
  if (present) {
    return { published, emailQueued: false };
  }

  try {
    const queued = await input.deps.outboxStore.enqueue({
      id: newEmailOutboxId(),
      conversationId: input.conversationId,
      emailType: "visitor_resume",
      idempotencyKey: resumeEmailIdempotencyKey({
        conversationId: input.conversationId,
        messageId: input.messageId,
      }),
      now: input.now,
    });
    return { published, emailQueued: queued };
  } catch {
    // Outbox down: the email is lost for this reply; the message itself stands.
    return { published, emailQueued: false };
  }
}

/* ── Default mysql2 adapters (used by the API routes) ─────────────── */

const COUNT_FRESH_SESSIONS_SQL =
  "SELECT COUNT(*) AS fresh_count FROM visitor_chat_sessions " +
  "WHERE conversation_id = ? AND revoked_at IS NULL AND expires_at > ? " +
  "AND last_seen_at >= ?";

/** mysql2 adapter for {@link PresenceStore}. */
export function createChatPresenceStore(pool: Pool): PresenceStore {
  return {
    async countFreshSessions(input) {
      const [rows] = await pool.query<RowDataPacket[]>(COUNT_FRESH_SESSIONS_SQL, [
        input.conversationId,
        input.now,
        input.freshBefore,
      ]);
      return Number(rows[0]?.fresh_count ?? 0);
    },
  };
}

// Mirrors the inbox unread semantics: only non-operator messages count, and
// closed conversations stop counting.
const COUNT_UNREAD_SQL =
  "SELECT COUNT(*) AS unread_count FROM chat_messages m " +
  "JOIN chat_conversations c ON c.id = m.conversation_id " +
  "LEFT JOIN operator_conversation_reads r " +
  "ON r.conversation_id = m.conversation_id AND r.operator_id = ? " +
  "WHERE m.sender_type <> 'operator' AND c.status <> 'closed' " +
  "AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)";

/** mysql2 adapter for {@link UnreadStore}. */
export function createChatUnreadStore(pool: Pool): UnreadStore {
  return {
    async countUnreadForOperator(operatorId) {
      const [rows] = await pool.query<RowDataPacket[]>(COUNT_UNREAD_SQL, [operatorId]);
      return Number(rows[0]?.unread_count ?? 0);
    },
  };
}

/** Bundle of default adapters plus the SSE publisher, for route wiring. */
export function createNotifyDeps(input: {
  readonly pool: Pool;
  readonly transport: PushTransport;
  readonly operatorId: string;
  readonly publish: (conversationId: string) => void;
}): NotifyDeps {
  return {
    publish: input.publish,
    transport: input.transport,
    pushStore: createPushSubscriptionStore(input.pool),
    outboxStore: createEmailOutboxStore(input.pool),
    presenceStore: createChatPresenceStore(input.pool),
    unreadStore: createChatUnreadStore(input.pool),
    operatorId: input.operatorId,
  };
}

/** Transport used while VAPID is unconfigured: every send fails, none is removed. */
const UNCONFIGURED_PUSH_TRANSPORT: PushTransport = {
  async send() {
    return { ok: false, gone: false };
  },
};

/**
 * Builds route-ready deps from the process environment. Returns `null` when no
 * operator identity is configured — callers then skip all notification work.
 */
export function createNotifyDepsFromEnv(input: {
  readonly pool: Pool;
  readonly env: { readonly [key: string]: string | undefined };
  readonly operatorId: string;
}): NotifyDeps | null {
  const vapid: VapidConfig | null = resolveVapidConfig(input.env);
  const transport =
    vapid === null
      ? UNCONFIGURED_PUSH_TRANSPORT
      : createWebPushTransport({ vapid });
  return createNotifyDeps({
    pool: input.pool,
    transport,
    operatorId: input.operatorId,
    publish: publishConversationChanged,
  });
}
