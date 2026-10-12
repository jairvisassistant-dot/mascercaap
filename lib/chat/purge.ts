import "server-only";

import type { Pool, ResultSetHeader } from "mysql2/promise";

/**
 * Application-level physical-purge service for a single chat conversation.
 *
 * This is a server-only Data Access Layer module (Next.js data-security guide:
 * `import "server-only"` keeps every database path out of the client bundle). It
 * is the mutation counterpart of the read DAL in `lib/chat/db.ts`.
 *
 * Contract:
 * - Purges exactly ONE conversation, addressed by its internal UUID. The id is
 *   always passed as a bound parameter, never interpolated into SQL.
 * - Runs inside a single transaction. Any failed statement rolls the whole purge
 *   back; the caller never observes a half-deleted conversation.
 * - Deletes every conversation-bound table explicitly (messages, visitor
 *   sessions, resume tokens, operator read cursors, pending outbox rows and
 *   conversation-scoped metric events) before removing the conversation row. The
 *   schema ALSO declares `ON DELETE CASCADE` on each of these foreign keys, so the
 *   explicit deletes are defense in depth that "proves" the cascade intent even
 *   if a cascade were ever dropped.
 * - Returns `Promise<void>` and never inspects `affectedRows`. Purging an
 *   existing conversation and purging one that never existed resolve exactly the
 *   same way, so this service can never become a public existence oracle. The
 *   future operator route must map its result to a single, constant response.
 * - Commercial consent (`chat_contact_consents`) is deliberately NOT touched: it
 *   has no foreign key to conversations, so a lawful independent consent survives
 *   the purge and a purge can never be interpreted as consent withdrawal.
 */

/** Bound values accepted by the purge statements. */
export type PurgeSqlParam =
  | string
  | number
  | boolean
  | Date
  | null
  | Buffer
  | Uint8Array;

/** Minimal result shape returned by the purge connection. */
export type PurgeStatementResult = { readonly affectedRows: number };

/** Narrow connection surface used inside one purge transaction. */
export interface ChatPurgeConnection {
  execute(
    sql: string,
    params: readonly PurgeSqlParam[]
  ): Promise<PurgeStatementResult>;
}

/** Narrow database surface; implemented over mysql2 by {@link createChatPurgeDatabase}. */
export interface ChatPurgeDatabase {
  transaction<T>(
    work: (connection: ChatPurgeConnection) => Promise<T>
  ): Promise<T>;
}

export type ConversationBoundDeletion = {
  /** Table whose rows are scoped to a single conversation. */
  readonly table: string;
  /** Parameterized DELETE statement binding the conversation id. */
  readonly sql: string;
};

/**
 * Ordered, explicit deletion plan for conversation-bound data. Order is not
 * constrained by the FKs (all are cascades), but every table is listed so the
 * plan is auditable and testable. Consent is intentionally absent.
 */
export const CONVERSATION_BOUND_DELETIONS: readonly ConversationBoundDeletion[] =
  Object.freeze([
    {
      table: "chat_messages",
      sql: "DELETE FROM chat_messages WHERE conversation_id = ?",
    },
    {
      table: "visitor_chat_sessions",
      sql: "DELETE FROM visitor_chat_sessions WHERE conversation_id = ?",
    },
    {
      table: "chat_resume_tokens",
      sql: "DELETE FROM chat_resume_tokens WHERE conversation_id = ?",
    },
    {
      table: "operator_conversation_reads",
      sql: "DELETE FROM operator_conversation_reads WHERE conversation_id = ?",
    },
    {
      table: "chat_email_outbox",
      sql: "DELETE FROM chat_email_outbox WHERE conversation_id = ?",
    },
    {
      table: "chat_metrics_events",
      sql: "DELETE FROM chat_metrics_events WHERE conversation_id = ?",
    },
  ]);

/** Removes the conversation row itself. The schema cascades any remaining child rows. */
export const DELETE_CONVERSATION_SQL =
  "DELETE FROM chat_conversations WHERE id = ?";

/** Longest accepted internal id, aligned with the CHAR(36) UUID columns. */
export const MAX_PURGE_ID_LENGTH = 191;

export class ChatPurgeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatPurgeInputError";
  }
}

/**
 * Rejects malformed purge targets before any database work. Only guards the
 * shape of the internal id; authorization of the caller is the operator route's
 * responsibility (this service assumes an already-authorized caller).
 */
export function assertPurgeTarget(conversationId: unknown): string {
  if (typeof conversationId !== "string") {
    throw new ChatPurgeInputError("Purge target must be a string.");
  }
  if (conversationId.trim().length === 0) {
    throw new ChatPurgeInputError("Purge target must be a non-empty string.");
  }
  if (conversationId !== conversationId.trim()) {
    throw new ChatPurgeInputError(
      "Purge target must not contain surrounding whitespace."
    );
  }
  if (conversationId.includes("\u0000")) {
    throw new ChatPurgeInputError("Purge target must not contain a null byte.");
  }
  if (conversationId.length > MAX_PURGE_ID_LENGTH) {
    throw new ChatPurgeInputError(
      `Purge target must be at most ${MAX_PURGE_ID_LENGTH} characters.`
    );
  }
  return conversationId;
}

/**
 * Physically purges one conversation and every row bound to it, inside a single
 * transaction. Resolves to `undefined` regardless of whether the conversation
 * existed, so it cannot be used to probe for resource existence.
 */
export async function purgeChatConversation(
  conversationId: string,
  database: ChatPurgeDatabase
): Promise<void> {
  const targetId = assertPurgeTarget(conversationId);

  await database.transaction(async (connection) => {
    for (const deletion of CONVERSATION_BOUND_DELETIONS) {
      await connection.execute(deletion.sql, [targetId]);
    }
    await connection.execute(DELETE_CONVERSATION_SQL, [targetId]);
  });
}

/**
 * Adapts a mysql2 pool to {@link ChatPurgeDatabase}. One connection is checked
 * out for the whole transaction and always released; a failure rolls back and is
 * re-thrown unchanged.
 */
export function createChatPurgeDatabase(pool: Pool): ChatPurgeDatabase {
  return {
    async transaction<T>(
      work: (connection: ChatPurgeConnection) => Promise<T>
    ): Promise<T> {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const purgeConnection: ChatPurgeConnection = {
          async execute(sql, params) {
            const [header] = await connection.execute<ResultSetHeader>(sql, [
              ...params,
            ]);
            return { affectedRows: Number(header.affectedRows ?? 0) };
          },
        };

        const result = await work(purgeConnection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}
