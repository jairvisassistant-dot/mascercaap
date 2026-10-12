import "server-only";

import type { Pool, RowDataPacket } from "mysql2/promise";

import {
  createVisitorConversationStore,
  isDuplicateKeyError,
  type ChatMessageRecord,
  type ListMessagesInput,
} from "./conversations";
import {
  CHAT_CLOSE_RESULTS,
  type ChatCloseResult,
  type ChatCursorValue,
  type ChatSenderType,
  type ConversationStatus,
} from "./types";
import { decodeChatCursor, encodeChatCursor } from "./validation";

/**
 * Server-only Data Access Layer for the coordinator inbox.
 *
 * The inbox reuses the existing admin/MFA boundary; this module is the
 * query/write layer behind those routes. All SQL binds its values (never
 * interpolates caller input) and every read/write is scoped to an authorized
 * operator identity derived server-side.
 *
 * Design facts:
 * - The conversation list is ordered by `COALESCE(last_message_at, created_at)`
 *   so a conversation that has no message yet still has a stable ordering key
 *   and can never be skipped by the composite `(activity_at, id)` cursor. The
 *   trade-off (a function in `ORDER BY`) is acceptable for a single-coordinator
 *   inbox; correctness of pagination is the priority.
 * - Unread counts are **derived** from the per-operator read cursor
 *   (`operator_conversation_reads.last_read_at`); there is no mutable unread
 *   counter column. Only non-operator messages count as unread.
 * - Marking a conversation read is a single atomic upsert whose new value is the
 *   conversation's current activity boundary, guarded by `GREATEST(...)` so two
 *   concurrent mark-read calls can never move the cursor backwards.
 * - Closing uses a conditional `status <> 'closed'` update, so concurrent closes
 *   cannot double-classify: the first writer wins and every caller then reads the
 *   same final row.
 * - Operator replies assign the conversation to the operator (open → assigned)
 *   and insert the message inside one transaction, so a failed insert never
 *   leaves a half-assigned conversation.
 *
 * Public payloads never contain the raw internal conversation UUID: the client
 * only ever receives an opaque handle that is not the id in clear text.
 */

/** Longest accepted inbox page; the list is bounded like the visitor history. */
export const OPERATOR_INBOX_DEFAULT_LIMIT = 30;
export const OPERATOR_INBOX_MAX_LIMIT = 100;

/** Persisted conversation fields shown in the inbox list. */
export type OperatorConversationListItem = {
  readonly id: string;
  readonly status: ConversationStatus;
  readonly visitorName: string;
  readonly assignedOperatorId: string | null;
  readonly closeResult: ChatCloseResult | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastMessageAt: Date | null;
  readonly closedAt: Date | null;
  readonly unreadCount: number;
};

/** Conversation fields shown on the thread detail (adds support contact data). */
export type OperatorConversationDetail = OperatorConversationListItem & {
  readonly visitorEmail: string;
  readonly visitorPhone: string | null;
  readonly closeNote: string | null;
};

/** Input accepted by {@link OperatorConversationStore.listConversations}. */
export type OperatorConversationListInput = {
  readonly operatorId: string;
  readonly status: ConversationStatus | null;
  readonly cursor: ChatCursorValue | null;
  readonly limit: number;
};

/** Operator-authored message insert (idempotency key required). */
export type NewOperatorMessageInput = {
  readonly id: string;
  readonly conversationId: string;
  readonly senderType: "operator";
  readonly senderName: string;
  readonly body: string;
  readonly clientMessageId: string;
  /** Server-derived operator id used to assign the conversation. */
  readonly operatorId: string;
  readonly createdAt: Date;
};

/** Input accepted by {@link OperatorConversationStore.closeConversation}. */
export type CloseConversationInput = {
  readonly conversationId: string;
  readonly operatorId: string;
  readonly closeResult: ChatCloseResult;
  readonly closeNote: string | null;
  readonly now: Date;
};

/** Port implemented by {@link createOperatorConversationStore}; mockable in tests. */
export interface OperatorConversationStore {
  listConversations(input: OperatorConversationListInput): Promise<OperatorConversationListItem[]>;
  findConversationById(conversationId: string): Promise<OperatorConversationDetail | null>;
  listMessages(input: ListMessagesInput): Promise<ChatMessageRecord[]>;
  findMessageByClientId(input: {
    readonly conversationId: string;
    readonly clientMessageId: string;
  }): Promise<ChatMessageRecord | null>;
  /** Assigns the conversation (open → assigned) and inserts the reply atomically. */
  insertMessage(input: NewOperatorMessageInput): Promise<void>;
  /** Atomic, monotonic mark-read; a no-op for a missing conversation. */
  markConversationRead(input: {
    readonly operatorId: string;
    readonly conversationId: string;
  }): Promise<void>;
  /** Conditional close; returns the final row or `null` when it does not exist. */
  closeConversation(input: CloseConversationInput): Promise<OperatorConversationDetail | null>;
}

/* ── Safe views ───────────────────────────────────────────────────── */

export type OperatorConversationListItemView = {
  readonly conversationHandle: string;
  readonly status: ConversationStatus;
  readonly visitorName: string;
  readonly assignedOperatorId: string | null;
  readonly closeResult: ChatCloseResult | null;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastMessageAt: string | null;
  readonly closedAt: string | null;
};

export type OperatorConversationDetailView = OperatorConversationListItemView & {
  readonly visitorEmail: string;
  readonly visitorPhone: string | null;
  readonly closeNote: string | null;
};

export type OperatorMessageView = {
  readonly id: string;
  readonly senderType: ChatSenderType;
  readonly body: string;
  readonly createdAt: string;
};

/* ── SQL ──────────────────────────────────────────────────────────── */

const LIST_CONVERSATIONS_SELECT =
  "SELECT c.id, c.status, c.visitor_name, c.assigned_operator_id, c.close_result, " +
  "c.created_at, c.updated_at, c.closed_at, c.last_message_at, " +
  "(SELECT COUNT(*) FROM chat_messages m " +
  "WHERE m.conversation_id = c.id AND m.sender_type <> 'operator' " +
  "AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)) AS unread_count " +
  "FROM chat_conversations c " +
  "LEFT JOIN operator_conversation_reads r " +
  "ON r.conversation_id = c.id AND r.operator_id = ?";

const LIST_CONVERSATIONS_ORDER =
  " ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC LIMIT ?";

const LIST_CONVERSATIONS_CURSOR =
  "(COALESCE(c.last_message_at, c.created_at) < ? " +
  "OR (COALESCE(c.last_message_at, c.created_at) = ? AND c.id < ?))";

const SELECT_DETAIL_COLUMNS =
  "id, status, visitor_name, visitor_email, visitor_phone, assigned_operator_id, " +
  "close_result, close_note, created_at, updated_at, closed_at, last_message_at";

const SELECT_DETAIL_SQL =
  `SELECT ${SELECT_DETAIL_COLUMNS} FROM chat_conversations WHERE id = ? LIMIT 1`;

const MARK_READ_SQL =
  "INSERT INTO operator_conversation_reads (operator_id, conversation_id, last_read_at) " +
  "SELECT ?, c.id, COALESCE(c.last_message_at, c.created_at) FROM chat_conversations c " +
  "WHERE c.id = ? " +
  "ON DUPLICATE KEY UPDATE last_read_at = GREATEST(last_read_at, VALUES(last_read_at))";

const CLOSE_CONVERSATION_SQL =
  "UPDATE chat_conversations SET status = 'closed', close_result = ?, close_note = ?, " +
  "closed_at = ?, assigned_operator_id = COALESCE(assigned_operator_id, ?), updated_at = ? " +
  "WHERE id = ? AND status <> 'closed'";

const ASSIGN_AND_TOUCH_SQL =
  "UPDATE chat_conversations SET " +
  "assigned_operator_id = COALESCE(assigned_operator_id, ?), " +
  "status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END, " +
  "last_message_at = ?, updated_at = ? WHERE id = ?";

const INSERT_OPERATOR_MESSAGE_SQL =
  "INSERT INTO chat_messages " +
  "(id, conversation_id, sender_type, sender_name, body, client_message_id, created_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?)";

/* ── Row mappers ──────────────────────────────────────────────────── */

type ConversationListRow = RowDataPacket & {
  id: string;
  status: string;
  visitor_name: string;
  assigned_operator_id: string | null;
  close_result: string | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  last_message_at: Date | null;
  unread_count: number | string | null;
};

type ConversationDetailRow = ConversationListRow & {
  visitor_email: string;
  visitor_phone: string | null;
  close_note: string | null;
};

function toConversationStatus(status: string): ConversationStatus {
  return status === "assigned" || status === "closed" ? status : "open";
}

function toCloseResult(value: unknown): ChatCloseResult | null {
  if (typeof value !== "string") return null;
  return (CHAT_CLOSE_RESULTS as readonly string[]).includes(value)
    ? (value as ChatCloseResult)
    : null;
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function toOptionalDate(value: unknown): Date | null {
  return value === null || value === undefined ? null : toDate(value);
}

function mapListRow(row: ConversationListRow): OperatorConversationListItem {
  return {
    id: String(row.id),
    status: toConversationStatus(String(row.status)),
    visitorName: String(row.visitor_name),
    assignedOperatorId:
      row.assigned_operator_id === null || row.assigned_operator_id === undefined
        ? null
        : String(row.assigned_operator_id),
    closeResult: toCloseResult(row.close_result),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    lastMessageAt: toOptionalDate(row.last_message_at),
    closedAt: toOptionalDate(row.closed_at),
    unreadCount: Number(row.unread_count ?? 0),
  };
}

function mapDetailRow(row: ConversationDetailRow): OperatorConversationDetail {
  return {
    ...mapListRow(row),
    visitorEmail: String(row.visitor_email),
    visitorPhone: row.visitor_phone === null ? null : String(row.visitor_phone),
    closeNote: row.close_note === null ? null : String(row.close_note),
  };
}

/* ── Opaque handle ────────────────────────────────────────────────── */

/**
 * Encodes a conversation id as an opaque handle so the raw internal UUID never
 * appears in a coordinator payload or URL. Reuses the tested cursor codec
 * (base64url, bounded, malformed-tolerant); the handle is not a capability —
 * authorization stays on the admin/MFA session.
 */
export function encodeConversationHandle(conversationId: string): string {
  return encodeChatCursor({ createdAt: "0", id: conversationId });
}

/** Decodes an opaque conversation handle; returns `null` for any malformed input. */
export function decodeConversationHandle(raw: string | null | undefined): string | null {
  const decoded = decodeChatCursor(raw);
  return decoded === null ? null : decoded.id;
}

/**
 * True when an opaque cursor's decoded timestamp is a real date. The cursor codec
 * only validates shape, so routes must reject a crafted `{ t: "garbage" }` before
 * it ever reaches SQL as a bound `Date`.
 */
export function isUsableCursorDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

/* ── Serializers ──────────────────────────────────────────────────── */

function toIso(value: Date): string {
  return value.toISOString();
}

export function toOperatorConversationListItemView(
  record: OperatorConversationListItem
): OperatorConversationListItemView {
  return {
    conversationHandle: encodeConversationHandle(record.id),
    status: record.status,
    visitorName: record.visitorName,
    assignedOperatorId: record.assignedOperatorId,
    closeResult: record.closeResult,
    unreadCount: record.unreadCount,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    lastMessageAt: record.lastMessageAt === null ? null : toIso(record.lastMessageAt),
    closedAt: record.closedAt === null ? null : toIso(record.closedAt),
  };
}

export function toOperatorConversationDetailView(
  record: OperatorConversationDetail
): OperatorConversationDetailView {
  return {
    ...toOperatorConversationListItemView(record),
    visitorEmail: record.visitorEmail,
    visitorPhone: record.visitorPhone,
    closeNote: record.closeNote,
  };
}

export function toOperatorMessageView(record: ChatMessageRecord): OperatorMessageView {
  return {
    id: record.id,
    senderType: record.senderType,
    body: record.body,
    createdAt: toIso(record.createdAt),
  };
}

/* ── Idempotent reply write ───────────────────────────────────────── */

/**
 * Idempotent operator reply write. A repeated `(conversation_id,
 * client_message_id)` returns the already-stored message; a concurrent race that
 * loses the unique-key insert is reconciled by re-reading the winner. Any other
 * failure propagates unchanged.
 */
export async function persistOperatorReply(
  input: NewOperatorMessageInput,
  store: Pick<OperatorConversationStore, "findMessageByClientId" | "insertMessage">
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

  return {
    message: {
      id: input.id,
      conversationId: input.conversationId,
      senderType: input.senderType,
      senderName: input.senderName,
      body: input.body,
      clientMessageId: input.clientMessageId,
      createdAt: input.createdAt,
    },
    duplicated: false,
  };
}

/* ── mysql2 adapter ───────────────────────────────────────────────── */

/** Adapts a mysql2 pool to {@link OperatorConversationStore} (bound parameters only). */
export function createOperatorConversationStore(pool: Pool): OperatorConversationStore {
  const messages = createVisitorConversationStore(pool);

  return {
    async listConversations(input) {
      const conditions: string[] = [];
      const params: Array<string | Date | number> = [input.operatorId];

      if (input.status !== null) {
        conditions.push("c.status = ?");
        params.push(input.status);
      }
      if (input.cursor !== null) {
        const cursorDate = new Date(input.cursor.createdAt);
        conditions.push(LIST_CONVERSATIONS_CURSOR);
        params.push(cursorDate, cursorDate, input.cursor.id);
      }

      const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
      params.push(input.limit);

      const [rows] = await pool.execute<ConversationListRow[]>(
        LIST_CONVERSATIONS_SELECT + where + LIST_CONVERSATIONS_ORDER,
        params
      );
      return rows.map(mapListRow);
    },

    async findConversationById(conversationId) {
      const [rows] = await pool.execute<ConversationDetailRow[]>(SELECT_DETAIL_SQL, [
        conversationId,
      ]);
      const row = rows[0];
      return row ? mapDetailRow(row) : null;
    },

    listMessages: (input) => messages.listMessages(input),
    findMessageByClientId: (input) => messages.findMessageByClientId(input),

    async insertMessage(input) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(ASSIGN_AND_TOUCH_SQL, [
          input.operatorId,
          input.createdAt,
          input.createdAt,
          input.conversationId,
        ]);
        await connection.execute(INSERT_OPERATOR_MESSAGE_SQL, [
          input.id,
          input.conversationId,
          input.senderType,
          input.senderName,
          input.body,
          input.clientMessageId,
          input.createdAt,
        ]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async markConversationRead(input) {
      await pool.execute(MARK_READ_SQL, [input.operatorId, input.conversationId]);
    },

    async closeConversation(input) {
      await pool.execute(CLOSE_CONVERSATION_SQL, [
        input.closeResult,
        input.closeNote,
        input.now,
        input.operatorId,
        input.now,
        input.conversationId,
      ]);
      const [rows] = await pool.execute<ConversationDetailRow[]>(SELECT_DETAIL_SQL, [
        input.conversationId,
      ]);
      const row = rows[0];
      return row ? mapDetailRow(row) : null;
    },
  };
}
