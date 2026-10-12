-- 001_chat_core.sql — forward-only MariaDB core schema for the live chat module.
--
-- Conventions (see odd/tasks/live-chat-implementation.md and Criterios-Chat.md):
--   * Every table is InnoDB with utf8mb4/utf8mb4_unicode_ci.
--   * Every timestamp is DATETIME(6) and is written in UTC. The mysql2 pool sets
--     `time_zone = '+00:00'` per connection (lib/chat/db.ts), so no server-local
--     time ever reaches these columns.
--   * Primary keys and foreign keys are internal UUIDs stored explicitly as
--     CHAR(36) ASCII. They are never exposed to clients; clients only ever see
--     opaque session cookies and resume tokens. No AUTO_INCREMENT ID is used.
--   * Session and resume-token secrets are stored only as their ASCII SHA-256
--     hash (CHAR(64)); the clear-text secret never reaches the database.
--   * Conversation-bound rows use a real InnoDB FOREIGN KEY ... ON DELETE CASCADE
--     so an application-level purge of one conversation physically removes its
--     messages, sessions, tokens, read cursors, pending outbox rows and
--     conversation-scoped metric events. See lib/chat/purge.ts.
--   * Commercial consent lives in its own table with NO foreign key to
--     conversations, so retaining or purging chat history never silently grants,
--     retains or deletes a lawful, independent consent record.
--   * Metrics contain no message body, name, email, phone, token or push
--     endpoint. The only conversation reference is the internal UUID, required to
--     prove cascade deletion on purge and never emitted in reports.
--
-- Portability / compatibility notes:
--   * MariaDB has no partial indexes (`... WHERE ...`), so equivalent full
--     composite indexes are used instead.
--   * No stored procedures, no DELIMITER, and no CHECK constraints: CHECK
--     enforcement is version-dependent on MariaDB and the Hostinger server
--     version is not yet confirmed. Enum-like columns use ENUM, and range/format
--     validation (body 1..1000, name 2..60, valid email) is enforced at the
--     application layer.
--   * Only SQL the in-repo migration splitter supports is used (single top-level
--     semicolon statements, no executable `/*! */` comments).
--
-- LIMITATION (honest): MariaDB DDL causes an implicit commit per statement, so
-- this migration is NOT atomic even though the runner wraps it in a transaction.
-- A failure partway through can leave some tables created. The runner records a
-- migration only after all statements succeed; recovery is to inspect the schema
-- and drop the partially created objects before re-running. Keep future schema
-- (DDL) and data (DML) changes in separate migration files.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  visitor_name VARCHAR(60) NOT NULL,
  visitor_email VARCHAR(320) NOT NULL,
  visitor_phone VARCHAR(32) NULL,
  status ENUM('open','assigned','closed') NOT NULL DEFAULT 'open',
  assigned_operator_id VARCHAR(191) NULL,
  close_result ENUM('resuelto','venta_o_pedido','seguimiento','sin_respuesta_del_cliente','sin_respuesta_de_la_coordinadora','fuera_de_alcance','duplicado/spam') NULL,
  close_note VARCHAR(500) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  closed_at DATETIME(6) NULL,
  last_message_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY chat_conversations_inbox_idx (status, last_message_at, id),
  KEY chat_conversations_cleanup_idx (status, closed_at),
  KEY chat_conversations_phone_idx (visitor_phone, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sender_type ENUM('visitor','operator','bot') NOT NULL,
  sender_name VARCHAR(191) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  client_message_id VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY chat_messages_client_message_uidx (conversation_id, client_message_id),
  KEY chat_messages_pagination_idx (conversation_id, created_at, id),
  CONSTRAINT chat_messages_conversation_fk FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_chat_sessions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  session_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  last_seen_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY visitor_chat_sessions_hash_uidx (session_hash),
  KEY visitor_chat_sessions_conversation_idx (conversation_id),
  CONSTRAINT visitor_chat_sessions_conversation_fk FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_resume_tokens (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  purpose ENUM('resume') NOT NULL DEFAULT 'resume',
  created_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  used_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY chat_resume_tokens_hash_uidx (token_hash),
  KEY chat_resume_tokens_conversation_idx (conversation_id),
  CONSTRAINT chat_resume_tokens_conversation_fk FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operator_conversation_reads (
  operator_id VARCHAR(191) NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  last_read_at DATETIME(6) NOT NULL,
  PRIMARY KEY (operator_id, conversation_id),
  KEY operator_conversation_reads_conversation_idx (conversation_id),
  CONSTRAINT operator_conversation_reads_conversation_fk FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operator_push_subscriptions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  operator_id VARCHAR(191) NOT NULL,
  endpoint VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  p256dh VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  auth VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY operator_push_subscriptions_endpoint_uidx (endpoint),
  KEY operator_push_subscriptions_operator_idx (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action ENUM('conversation_open','message_send') NOT NULL,
  window_start DATETIME(6) NOT NULL,
  window_seconds INT UNSIGNED NOT NULL,
  max_requests INT UNSIGNED NOT NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY rate_limit_entries_window_uidx (key_hash, action, window_start),
  KEY rate_limit_entries_window_start_idx (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_email_outbox (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  email_type ENUM('visitor_resume','operator_notification') NOT NULL,
  idempotency_key VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(6) NULL,
  last_error_code VARCHAR(64) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  sent_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY chat_email_outbox_idempotency_uidx (idempotency_key),
  KEY chat_email_outbox_status_idx (status, next_attempt_at),
  KEY chat_email_outbox_conversation_idx (conversation_id),
  CONSTRAINT chat_email_outbox_conversation_fk FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_metrics_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  conversation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  event_type ENUM('conversation_created','message_persisted','first_operator_response','presence_expired','conversation_closed','conversation_purged','outcome_classified','consent_granted','consent_revoked','cleanup_completed') NOT NULL,
  sender_type ENUM('visitor','operator','bot') NULL,
  intent VARCHAR(64) NULL,
  close_result ENUM('resuelto','venta_o_pedido','seguimiento','sin_respuesta_del_cliente','sin_respuesta_de_la_coordinadora','fuera_de_alcance','duplicado/spam') NULL,
  occurred_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY chat_metrics_events_type_time_idx (event_type, occurred_at),
  KEY chat_metrics_events_conversation_idx (conversation_id),
  CONSTRAINT chat_metrics_events_conversation_fk FOREIGN KEY (conversation_id)
    REFERENCES chat_conversations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_metrics_daily (
  metric_day DATE NOT NULL,
  metric_key VARCHAR(64) NOT NULL,
  metric_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (metric_day, metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_contact_consents (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  contact_channel ENUM('email','whatsapp') NOT NULL,
  contact_value VARCHAR(320) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  consent_text_version VARCHAR(64) NOT NULL,
  consent_state ENUM('granted','revoked') NOT NULL DEFAULT 'granted',
  source VARCHAR(64) NOT NULL,
  granted_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY chat_contact_consents_contact_uidx (contact_channel, contact_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
