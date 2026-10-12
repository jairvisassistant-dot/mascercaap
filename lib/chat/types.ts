/**
 * Shared chat domain types, constants, and safe response shapes.
 *
 * This module is intentionally pure TypeScript: no `server-only`, no database,
 * no Next.js imports. It is the neutral domain vocabulary that both the
 * server-only security modules and (later) client-side forms can import, while
 * every security decision stays inside `visitor-session.ts`, `resume-token.ts`
 * and `operator-auth.ts`.
 *
 * Bounds mirror `Criterios-Chat.md` section 8.6 and the column widths of
 * `lib/chat/migrations/001_chat_core.sql`. Keeping them in one place prevents
 * the schema, the route validation and the UI counter from drifting apart.
 */

/** Persisted conversation states (mirrors `chat_conversations.status`). */
export const CONVERSATION_STATUSES = ["open", "assigned", "closed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** Persisted message sender types (mirrors `chat_messages.sender_type`). */
export const CHAT_SENDER_TYPES = ["visitor", "operator", "bot"] as const;
export type ChatSenderType = (typeof CHAT_SENDER_TYPES)[number];

/** Mandatory close-result classification (mirrors `chat_conversations.close_result`). */
export const CHAT_CLOSE_RESULTS = [
  "resuelto",
  "venta_o_pedido",
  "seguimiento",
  "sin_respuesta_del_cliente",
  "sin_respuesta_de_la_coordinadora",
  "fuera_de_alcance",
  "duplicado/spam",
] as const;
export type ChatCloseResult = (typeof CHAT_CLOSE_RESULTS)[number];

/** Chat resume-token purposes (mirrors `chat_resume_tokens.purpose`). */
export const CHAT_RESUME_TOKEN_PURPOSES = ["resume"] as const;
export type ChatResumeTokenPurpose = (typeof CHAT_RESUME_TOKEN_PURPOSES)[number];

/** Documented field bounds (Criterios-Chat.md section 8.6 + schema widths). */
export const CHAT_VISITOR_NAME_MIN_LENGTH = 2;
export const CHAT_VISITOR_NAME_MAX_LENGTH = 60;
export const CHAT_VISITOR_EMAIL_MAX_LENGTH = 320;
export const CHAT_VISITOR_PHONE_MAX_LENGTH = 32;
export const CHAT_MESSAGE_BODY_MIN_LENGTH = 1;
export const CHAT_MESSAGE_BODY_MAX_LENGTH = 1000;
export const CHAT_CLOSE_NOTE_MAX_LENGTH = 500;
/** Longest accepted opaque pagination cursor; keeps a hostile cursor bounded. */
export const CHAT_CURSOR_MAX_LENGTH = 512;

/** Visitor chat entry form payload (after validation). */
export type ChatEntryInput = {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  /**
   * Optional commercial contact consent. It is never required: refusing it must
   * not block opening or continuing the conversation.
   */
  readonly marketingConsent: boolean;
};

/** Visitor client message payload (after validation). */
export type ClientMessageInput = {
  readonly body: string;
  /** Random, unique-per-conversation idempotency key. */
  readonly clientMessageId: string;
};

/** Operator reply payload (after validation). */
export type OperatorReplyInput = {
  readonly body: string;
  readonly clientMessageId: string;
};

/** Operator close payload (after validation). */
export type OperatorCloseInput = {
  readonly closeResult: ChatCloseResult;
  readonly closeNote?: string;
  /** When true, the conversation and its rows are physically purged. */
  readonly purge: boolean;
};

/**
 * Composite pagination cursor value: the stable `(created_at, id)` tuple used by
 * the visitor/coordinator polling endpoints. It is encoded as an opaque string
 * before it ever leaves the server, so no raw timestamp/id ordering is exposed.
 */
export type ChatCursorValue = {
  readonly createdAt: string;
  readonly id: string;
};

/**
 * Stable, non-enumerating error code returned to any client for an invalid,
 * expired, revoked or purged chat resource. The same code is used for every
 * failure so the response can never be used as an existence oracle.
 */
export const CHAT_GENERIC_ERROR_CODE = "chat_request_failed" as const;

/** Generic error envelope. Contains no resource identity and no detail. */
export type ChatErrorResponse = {
  readonly success: false;
  readonly error: string;
};

/** Success envelope carrying a typed payload. */
export type ChatSuccessResponse<T> = {
  readonly success: true;
  readonly data: T;
};

/** Discriminated response envelope for chat API routes. */
export type ChatResponse<T> = ChatSuccessResponse<T> | ChatErrorResponse;

/** Builds the single generic error envelope; never tailors it to the failure. */
export function chatErrorResponse(): ChatErrorResponse {
  return { success: false, error: CHAT_GENERIC_ERROR_CODE };
}
