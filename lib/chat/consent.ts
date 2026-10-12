import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, RowDataPacket } from "mysql2/promise";

import {
  buildConsentGrantedEvent,
  createChatMetricsEventWriter,
  writeChatMetricEventBestEffort,
} from "./metrics";

/**
 * Commercial-contact consent data access layer (Criterios-Chat.md section 11,
 * PlanImplementacion-Chat.md Phase 8 tasks 5 and 6).
 *
 * Contract:
 * - `chat_contact_consents` has **no** foreign key to conversations: purging or
 *   cleaning up a conversation never touches a consent record, and a consent
 *   record never grants anything by itself. Evidence of the grant and of the
 *   revocation is kept in the row (`consent_text_version`, `source`,
 *   `granted_at`, `revoked_at`).
 * - No-consent default: this module only ever writes when the caller
 *   explicitly captures an opt-in. There is no implicit capture, no default
 *   grant and no background backfill.
 * - Revocation is immediate and idempotent: `consent_state = 'revoked'` with
 *   `revoked_at` is committed by `revoke`, and `isCommerciallyEligible`
 *   returns `false` from that moment for every future send decision.
 * - Every statement binds its values as parameters; no contact value, version
 *   or source is ever interpolated into SQL. The DAL never reads conversation
 *   data.
 *
 * `CHAT_MARKETING_ENABLED` gates commercial **sending**, not this evidence:
 * an explicit visitor opt-in is recorded whenever it is given (D2/D4 still
 * decide retention period and contact frequency).
 */

/** Approved contact channels; matches the `contact_channel` ENUM of migration 001. */
export const CHAT_CONTACT_CHANNELS = ["email", "whatsapp"] as const;
export type ChatContactChannel = (typeof CHAT_CONTACT_CHANNELS)[number];

/** Column width of `chat_contact_consents.contact_value` (VARCHAR(320)). */
export const CHAT_CONTACT_VALUE_MAX_LENGTH = 320;

/**
 * Version of the consent text the visitor accepted. Bump whenever the form
 * copy changes so the stored evidence stays attributable to an exact wording.
 */
export const CHAT_CONSENT_TEXT_VERSION = "2026-10-10.1";

/** Where this unit's evidence originates: the visitor chat entry form. */
export const CHAT_CONSENT_SOURCE_CHAT_ENTRY = "chat_entry_form";

/** Raised for malformed consent input before any database work happens. */
export class ChatConsentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatConsentInputError";
  }
}

export function assertConsentChannel(value: unknown): ChatContactChannel {
  if (typeof value !== "string" || !(CHAT_CONTACT_CHANNELS as readonly string[]).includes(value)) {
    throw new ChatConsentInputError("Unsupported consent channel.");
  }
  return value as ChatContactChannel;
}

export function assertConsentContactValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new ChatConsentInputError("Contact value must be a string.");
  }
  if (value.trim().length === 0) {
    throw new ChatConsentInputError("Contact value must be non-empty.");
  }
  if (value !== value.trim()) {
    throw new ChatConsentInputError("Contact value must not contain surrounding whitespace.");
  }
  if (value.includes("\u0000")) {
    throw new ChatConsentInputError("Contact value must not contain a null byte.");
  }
  if (value.length > CHAT_CONTACT_VALUE_MAX_LENGTH) {
    throw new ChatConsentInputError("Contact value is too long.");
  }
  return value;
}

function assertBounded(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ChatConsentInputError(`${field} must be a string.`);
  }
  if (value.trim().length === 0) {
    throw new ChatConsentInputError(`${field} must be non-empty.`);
  }
  if (value.length > max) {
    throw new ChatConsentInputError(`${field} is too long.`);
  }
  return value;
}

/* ── Statements (bound parameters only) ───────────────────────────── */

/**
 * Grant-or-refresh for one (channel, value) pair. The unique key
 * `(contact_channel, contact_value)` keeps exactly one row per contact, so the
 * upsert is what makes capture idempotent. A fresh opt-in after a revocation
 * re-grants and clears `revoked_at`.
 */
export const INSERT_CONTACT_CONSENT_SQL =
  "INSERT INTO chat_contact_consents " +
  "(id, contact_channel, contact_value, consent_text_version, consent_state, source, granted_at, revoked_at, created_at, updated_at) " +
  "VALUES (?, ?, ?, ?, 'granted', ?, ?, NULL, ?, ?) " +
  "ON DUPLICATE KEY UPDATE consent_state = 'granted', consent_text_version = ?, " +
  "source = ?, granted_at = ?, revoked_at = NULL, updated_at = ?";

/** Revocation; the state guard keeps it idempotent and `revoked_at` single-shot. */
export const REVOKE_CONTACT_CONSENT_SQL =
  "UPDATE chat_contact_consents SET consent_state = 'revoked', revoked_at = ?, updated_at = ? " +
  "WHERE contact_channel = ? AND contact_value = ? AND consent_state = 'granted'";

/** Send-eligibility read: granted, never revoked, one row, no ordering needed. */
export const SELECT_COMMERCIAL_ELIGIBILITY_SQL =
  "SELECT 1 AS present FROM chat_contact_consents " +
  "WHERE contact_channel = ? AND contact_value = ? " +
  "AND consent_state = 'granted' AND revoked_at IS NULL LIMIT 1";

/* ── Store ────────────────────────────────────────────────────────── */

export type CaptureContactConsentInput = {
  readonly id: string;
  readonly channel: ChatContactChannel;
  readonly contactValue: string;
  readonly textVersion: string;
  readonly source: string;
  readonly now: Date;
};

export interface ContactConsentStore {
  /** Records an explicit opt-in (idempotent per channel + contact value). */
  capture(input: CaptureContactConsentInput): Promise<void>;
  /** Revokes immediately; `false` when there was nothing left to revoke. */
  revoke(input: {
    readonly channel: ChatContactChannel;
    readonly contactValue: string;
    readonly now: Date;
  }): Promise<boolean>;
  /** The single gate every commercial send must consult first. */
  isCommerciallyEligible(input: {
    readonly channel: ChatContactChannel;
    readonly contactValue: string;
  }): Promise<boolean>;
  /**
   * Optional, best-effort `consent_granted` metric emission (LC-WU-12 gap
   * closed by LC-WU-13). Implemented by the mysql2 store; absent on minimal
   * fakes, so it is never part of the capture contract and a missing or
   * failing sink can never fail a consent capture.
   */
  emitConsentGranted?(input: { readonly now: Date }): Promise<void>;
}

/** mysql2 adapter for {@link ContactConsentStore} (bound parameters only). */
export function createContactConsentStore(pool: Pool): ContactConsentStore {
  return {
    async capture(input) {
      const id = assertBounded(input.id, "Consent id", 191);
      const channel = assertConsentChannel(input.channel);
      const contactValue = assertConsentContactValue(input.contactValue);
      const textVersion = assertBounded(input.textVersion, "Consent text version", 64);
      const source = assertBounded(input.source, "Consent source", 64);
      if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
        throw new ChatConsentInputError("Consent timestamp must be a valid date.");
      }

      await pool.execute(INSERT_CONTACT_CONSENT_SQL, [
        id,
        channel,
        contactValue,
        textVersion,
        source,
        input.now,
        input.now,
        input.now,
        textVersion,
        source,
        input.now,
        input.now,
      ]);
    },

    async revoke(input) {
      const channel = assertConsentChannel(input.channel);
      const contactValue = assertConsentContactValue(input.contactValue);
      if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
        throw new ChatConsentInputError("Revocation timestamp must be a valid date.");
      }

      const [result] = await pool.execute(REVOKE_CONTACT_CONSENT_SQL, [
        input.now,
        input.now,
        channel,
        contactValue,
      ]);
      return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
    },

    async isCommerciallyEligible(input) {
      const channel = assertConsentChannel(input.channel);
      const contactValue = assertConsentContactValue(input.contactValue);

      const [rows] = await pool.execute<RowDataPacket[]>(
        SELECT_COMMERCIAL_ELIGIBILITY_SQL,
        [channel, contactValue]
      );
      return Array.isArray(rows) && rows.length > 0;
    },

    async emitConsentGranted(input) {
      // Conversation-independent marker (NULL conversation id): consent
      // evidence is never deleted by a purge, and no contact value is stored.
      await writeChatMetricEventBestEffort(
        createChatMetricsEventWriter(pool),
        buildConsentGrantedEvent({ occurredAt: input.now })
      );
    },
  };
}

/* ── Visitor entry wiring ─────────────────────────────────────────── */

/**
 * Captures the consent evidence for one chat entry submission.
 *
 * Called only when the visitor explicitly opted in; it records the email
 * channel and, when a phone was given, the WhatsApp channel — each with its
 * own id, the shared text version, the entry source and the submission time.
 * The caller owns best-effort semantics: a failure here must never fail the
 * conversation itself.
 */
export async function captureChatEntryConsent(input: {
  readonly store: ContactConsentStore;
  readonly email: string;
  readonly phone?: string | null;
  readonly now: Date;
}): Promise<void> {
  await input.store.capture({
    id: randomUUID(),
    channel: "email",
    contactValue: assertConsentContactValue(input.email),
    textVersion: CHAT_CONSENT_TEXT_VERSION,
    source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
    now: input.now,
  });

  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (phone.length > 0) {
    await input.store.capture({
      id: randomUUID(),
      channel: "whatsapp",
      contactValue: assertConsentContactValue(phone),
      textVersion: CHAT_CONSENT_TEXT_VERSION,
      source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      now: input.now,
    });
  }

  // Best-effort `consent_granted` metric (LC-WU-12 gap closed by LC-WU-13):
  // both consent rows are already committed, so emission is a side observation
  // that must never fail the entry request calling this wiring helper.
  try {
    await input.store.emitConsentGranted?.({ now: input.now });
  } catch {
    // Swallowed by contract; the consent evidence itself has been recorded.
  }
}
