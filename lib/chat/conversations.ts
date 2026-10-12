import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { Pool, RowDataPacket } from "mysql2/promise";

import { CHAT_BOT_SENDER_NAME } from "./bot-catalog";
import {
  buildConversationCreatedEvent,
  createChatMetricsEventWriter,
  writeChatMetricEventBestEffort,
} from "./metrics";
import type {
  ChatCursorValue,
  ChatSenderType,
  ClientMessageInput,
  ConversationStatus,
} from "./types";

/**
 * Server-only conversation/message data access for the visitor API.
 *
 * Every statement binds its values (never interpolates caller input). The write
 * paths run inside a single transaction: creating a conversation and its session
 * is atomic, and inserting a message also touches the conversation's
 * `last_message_at` in the same unit of work, so a failed insert never leaves a
 * stale conversation timestamp behind.
 *
 * Public payloads never include the internal conversation id. Reads are always
 * scoped by the session-derived conversation id; message selection uses the
 * composite `(created_at, id)` cursor for stable, duplicate-free pagination.
 */

/** Longest history page accepted from a client. */
export const CHAT_HISTORY_DEFAULT_LIMIT = 50;
export const CHAT_HISTORY_MAX_LIMIT = 100;

/** Persisted conversation fields needed by the visitor API. */
export type ConversationRecord = {
  readonly id: string;
  readonly status: ConversationStatus;
  readonly visitorName: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastMessageAt: Date | null;
};

/** Persisted message fields needed by the visitor API. */
export type ChatMessageRecord = {
  readonly id: string;
  readonly conversationId: string;
  readonly senderType: ChatSenderType;
  readonly senderName: string;
  readonly body: string;
  readonly clientMessageId: string | null;
  readonly createdAt: Date;
};

/** Input for the atomic conversation + session creation. */
export type CreateConversationWithSessionInput = {
  readonly conversationId: string;
  readonly visitorName: string;
  readonly visitorEmail: string;
  readonly visitorPhone: string | null;
  readonly sessionId: string;
  readonly sessionHash: string;
  readonly sessionCreatedAt: Date;
  readonly sessionLastSeenAt: Date;
  readonly sessionExpiresAt: Date;
  readonly now: Date;
};

/** Input for inserting one visitor message (idempotency key required). */
export type NewVisitorMessageInput = {
  readonly id: string;
  readonly conversationId: string;
  readonly senderType: ChatSenderType;
  readonly senderName: string;
  readonly body: string;
  readonly clientMessageId: string;
  readonly createdAt: Date;
};

/** History page request; `cursor` is the previously returned composite cursor. */
export type ListMessagesInput = {
  readonly conversationId: string;
  readonly cursor: ChatCursorValue | null;
  readonly limit: number;
};

/** Port implemented by {@link createVisitorConversationStore}; mockable in tests. */
export interface VisitorConversationStore {
  createConversationWithSession(input: CreateConversationWithSessionInput): Promise<void>;
  findConversationById(conversationId: string): Promise<ConversationRecord | null>;
  listMessages(input: ListMessagesInput): Promise<ChatMessageRecord[]>;
  findMessageByClientId(input: {
    readonly conversationId: string;
    readonly clientMessageId: string;
  }): Promise<ChatMessageRecord | null>;
  /** Throws a duplicate-key error when `(conversation_id, client_message_id)` exists. */
  insertMessage(input: NewVisitorMessageInput): Promise<void>;
}

/** Safe conversation payload; intentionally has no internal id. */
export type VisitorConversationView = {
  readonly status: ConversationStatus;
  readonly createdAt: string;
  readonly lastMessageAt: string | null;
};

/** Safe message payload. */
export type VisitorMessageView = {
  readonly id: string;
  readonly senderType: ChatSenderType;
  readonly body: string;
  readonly createdAt: string;
};

const INSERT_CONVERSATION_SQL =
  "INSERT INTO chat_conversations " +
  "(id, visitor_name, visitor_email, visitor_phone, status, assigned_operator_id, " +
  "close_result, close_note, created_at, updated_at, closed_at, last_message_at) " +
  "VALUES (?, ?, ?, ?, 'open', NULL, NULL, NULL, ?, ?, NULL, NULL)";

const INSERT_SESSION_SQL =
  "INSERT INTO visitor_chat_sessions " +
  "(id, conversation_id, session_hash, created_at, last_seen_at, expires_at) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

const SELECT_CONVERSATION_SQL =
  "SELECT id, status, visitor_name, created_at, updated_at, last_message_at " +
  "FROM chat_conversations WHERE id = ? LIMIT 1";

const SELECT_MESSAGE_COLUMNS =
  "id, conversation_id, sender_type, sender_name, body, client_message_id, created_at";

const SELECT_MESSAGE_BY_CLIENT_SQL =
  `SELECT ${SELECT_MESSAGE_COLUMNS} FROM chat_messages ` +
  "WHERE conversation_id = ? AND client_message_id = ? LIMIT 1";

const LIST_MESSAGES_SQL =
  `SELECT ${SELECT_MESSAGE_COLUMNS} FROM chat_messages WHERE conversation_id = ?`;

const LIST_MESSAGES_AFTER_CURSOR_SQL =
  `${LIST_MESSAGES_SQL} AND (created_at < ? OR (created_at = ? AND id < ?))`;

const LIST_MESSAGES_ORDER_SQL = " ORDER BY created_at DESC, id DESC LIMIT ?";

const INSERT_MESSAGE_SQL =
  "INSERT INTO chat_messages " +
  "(id, conversation_id, sender_type, sender_name, body, client_message_id, created_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?)";

const TOUCH_CONVERSATION_SQL =
  "UPDATE chat_conversations SET last_message_at = ?, updated_at = ? WHERE id = ?";

type ConversationRow = RowDataPacket & {
  id: string;
  status: string;
  visitor_name: string;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date | null;
};

type MessageRow = RowDataPacket & {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  client_message_id: string | null;
  created_at: Date;
};

function toConversationStatus(status: string): ConversationStatus {
  return status === "assigned" || status === "closed" ? status : "open";
}

function toSenderType(senderType: string): ChatSenderType {
  if (senderType === "operator" || senderType === "bot") return senderType;
  return "visitor";
}

function mapConversationRow(row: ConversationRow): ConversationRecord {
  return {
    id: String(row.id),
    status: toConversationStatus(String(row.status)),
    visitorName: String(row.visitor_name),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastMessageAt: row.last_message_at === null ? null : new Date(row.last_message_at),
  };
}

function mapMessageRow(row: MessageRow): ChatMessageRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderType: toSenderType(String(row.sender_type)),
    senderName: String(row.sender_name),
    body: String(row.body),
    clientMessageId: row.client_message_id === null ? null : String(row.client_message_id),
    createdAt: new Date(row.created_at),
  };
}

/** Serializes a conversation without ever exposing its internal id. */
export function toVisitorConversationView(record: ConversationRecord): VisitorConversationView {
  return {
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    lastMessageAt: record.lastMessageAt === null ? null : record.lastMessageAt.toISOString(),
  };
}

/** Serializes a message for the visitor thread. */
export function toVisitorMessageView(record: ChatMessageRecord): VisitorMessageView {
  return {
    id: record.id,
    senderType: record.senderType,
    body: record.body,
    createdAt: record.createdAt.toISOString(),
  };
}

/** True for a MySQL/MariaDB unique-constraint violation (`ER_DUP_ENTRY`, 1062). */
export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { readonly code?: unknown; readonly errno?: unknown };
  return candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
}

/**
 * Idempotent visitor message write. A repeated `(conversation_id,
 * client_message_id)` returns the already-stored message; a concurrent race that
 * loses the unique-key insert is reconciled by re-reading the winner. Any other
 * failure propagates unchanged.
 */
export async function persistVisitorMessage(
  input: NewVisitorMessageInput,
  store: VisitorConversationStore
): Promise<{ readonly message: ChatMessageRecord; readonly duplicated: boolean }> {
  const existing = await store.findMessageByClientId({
    conversationId: input.conversationId,
    clientMessageId: input.clientMessageId,
  });
  if (existing !== null) return { message: existing, duplicated: true };

  try {
    await store.insertMessage(input);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const winner = await store.findMessageByClientId({
      conversationId: input.conversationId,
      clientMessageId: input.clientMessageId,
    });
    if (winner !== null) return { message: winner, duplicated: true };
    throw error;
  }

  return { message: { ...input }, duplicated: false };
}

/** Adapts a mysql2 pool to {@link VisitorConversationStore} (bound parameters only). */
export function createVisitorConversationStore(pool: Pool): VisitorConversationStore {
  return {
    async createConversationWithSession(input) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(INSERT_CONVERSATION_SQL, [
          input.conversationId,
          input.visitorName,
          input.visitorEmail,
          input.visitorPhone,
          input.now,
          input.now,
        ]);
        await connection.execute(INSERT_SESSION_SQL, [
          input.sessionId,
          input.conversationId,
          input.sessionHash,
          input.sessionCreatedAt,
          input.sessionLastSeenAt,
          input.sessionExpiresAt,
        ]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

      // LC-WU-12 gap closed by LC-WU-13: one `conversation_created` marker per
      // opened (or reopened) chat, written strictly after the transaction has
      // committed and best-effort by contract — `writeChatMetricEventBestEffort`
      // never throws, so a metrics failure can never fail conversation creation.
      // The event carries the internal conversation id only; no name, email,
      // phone or message text ever reaches `chat_metrics_events`.
      await writeChatMetricEventBestEffort(
        createChatMetricsEventWriter(pool),
        buildConversationCreatedEvent({
          conversationId: input.conversationId,
          occurredAt: input.now,
        })
      );
    },

    async findConversationById(conversationId) {
      const [rows] = await pool.execute<ConversationRow[]>(SELECT_CONVERSATION_SQL, [
        conversationId,
      ]);
      const row = rows[0];
      return row ? mapConversationRow(row) : null;
    },

    async listMessages(input) {
      const sql =
        input.cursor === null
          ? LIST_MESSAGES_SQL + LIST_MESSAGES_ORDER_SQL
          : LIST_MESSAGES_AFTER_CURSOR_SQL + LIST_MESSAGES_ORDER_SQL;
      const cursorDate =
        input.cursor === null ? null : new Date(input.cursor.createdAt);
      const params =
        input.cursor === null || cursorDate === null
          ? [input.conversationId, input.limit]
          : [
              input.conversationId,
              cursorDate,
              cursorDate,
              input.cursor.id,
              input.limit,
            ];
      const [rows] = await pool.execute<MessageRow[]>(sql, params);
      return rows.map(mapMessageRow);
    },

    async findMessageByClientId(input) {
      const [rows] = await pool.execute<MessageRow[]>(SELECT_MESSAGE_BY_CLIENT_SQL, [
        input.conversationId,
        input.clientMessageId,
      ]);
      const row = rows[0];
      return row ? mapMessageRow(row) : null;
    },

    async insertMessage(input) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(INSERT_MESSAGE_SQL, [
          input.id,
          input.conversationId,
          input.senderType,
          input.senderName,
          input.body,
          input.clientMessageId,
          input.createdAt,
        ]);
        await connection.execute(TOUCH_CONVERSATION_SQL, [
          input.createdAt,
          input.createdAt,
          input.conversationId,
        ]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

/** Builds a fresh message command from validated input and server identity. */
export function buildVisitorMessageCommand(input: {
  readonly conversationId: string;
  readonly senderName: string;
  readonly message: ClientMessageInput;
  readonly now: Date;
  readonly id?: string;
}): NewVisitorMessageInput {
  return {
    id: input.id ?? randomUUID(),
    conversationId: input.conversationId,
    senderType: "visitor",
    senderName: input.senderName,
    body: input.message.body,
    clientMessageId: input.message.clientMessageId,
    createdAt: input.now,
  };
}

/**
 * Deterministic idempotency key for the bot reply to a given visitor message
 * (LC-WU-10). Deriving it from the conversation scope and the visitor's
 * `client_message_id` makes the unique `(conversation_id, client_message_id)`
 * key dedupe concurrent bot replies across racing requests, so a retried or
 * raced visitor send can never produce two bot answers for one message. The
 * SHA-256 hex digest (64 ASCII chars) always fits the `VARCHAR(191)` column.
 */
export function deriveBotClientMessageId(input: {
  readonly conversationId: string;
  readonly visitorClientMessageId: string;
}): string {
  return createHash("sha256")
    .update(`${input.conversationId}:${input.visitorClientMessageId}`)
    .digest("hex");
}

/**
 * Builds the bot reply command on the same write path as every other message:
 * same bounds (the catalog guarantees 1–1000), same idempotency model, same
 * ordering, with the sender identity stamped server-side only.
 */
export function buildBotMessageCommand(input: {
  readonly conversationId: string;
  readonly visitorClientMessageId: string;
  readonly body: string;
  readonly now: Date;
  readonly id?: string;
}): NewVisitorMessageInput {
  return {
    id: input.id ?? randomUUID(),
    conversationId: input.conversationId,
    senderType: "bot",
    senderName: CHAT_BOT_SENDER_NAME,
    body: input.body,
    clientMessageId: deriveBotClientMessageId(input),
    createdAt: input.now,
  };
}

/* ── Metrics events (intent metadata for aggregates, LC-WU-10) ────── */

/**
 * Event types this unit may write. The ENUM in `001_chat_core.sql` is the
 * durable constraint; LC-WU-12 owns aggregation/reporting over these rows.
 */
export const CHAT_METRIC_EVENT_TYPES = ["message_persisted"] as const;
export type ChatMetricEventType = (typeof CHAT_METRIC_EVENT_TYPES)[number];

/**
 * Intent metadata needed for aggregate metrics (Criterios-Chat.md
 * section 11: "rendimiento por intención, sin registrar contenido de
 * mensajes"). Only the intent CODE and sender type are persisted — never a
 * message body, matched text or classifier debug output.
 */
export type NewChatMetricEventInput = {
  readonly id: string;
  readonly conversationId: string;
  readonly eventType: ChatMetricEventType;
  readonly senderType: ChatSenderType | null;
  /** Closed intent code from `CHAT_BOT_INTENTS`; never customer content. */
  readonly intent: string | null;
  readonly occurredAt: Date;
};

/** Port implemented by {@link createChatMetricEventStore}; mockable in tests. */
export interface ChatMetricEventStore {
  insertEvent(input: NewChatMetricEventInput): Promise<void>;
}

const INSERT_METRIC_EVENT_SQL =
  "INSERT INTO chat_metrics_events " +
  "(id, conversation_id, event_type, sender_type, intent, close_result, occurred_at) " +
  "VALUES (?, ?, ?, ?, ?, NULL, ?)";

/** mysql2 adapter for {@link ChatMetricEventStore} (bound parameters only). */
export function createChatMetricEventStore(pool: Pool): ChatMetricEventStore {
  return {
    async insertEvent(input) {
      await pool.execute(INSERT_METRIC_EVENT_SQL, [
        input.id,
        input.conversationId,
        input.eventType,
        input.senderType,
        input.intent,
        input.occurredAt,
      ]);
    },
  };
}

/**
 * Builds the intent-metric event for one classified visitor message. The
 * sender type records the outcome: `bot` when the bot answered, `visitor`
 * when the conversation was handed off to the coordinator.
 */
export function buildBotIntentMetricEvent(input: {
  readonly conversationId: string;
  readonly intent: string;
  readonly botReplied: boolean;
  readonly occurredAt: Date;
  readonly id?: string;
}): NewChatMetricEventInput {
  return {
    id: input.id ?? randomUUID(),
    conversationId: input.conversationId,
    eventType: "message_persisted",
    senderType: input.botReplied ? "bot" : "visitor",
    intent: input.intent,
    occurredAt: input.occurredAt,
  };
}
