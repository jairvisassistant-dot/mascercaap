import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import type { Pool } from "mysql2/promise";

import {
  CHAT_CONSENT_SOURCE_CHAT_ENTRY,
  CHAT_CONSENT_TEXT_VERSION,
  CHAT_CONTACT_CHANNELS,
  CHAT_CONTACT_VALUE_MAX_LENGTH,
  ChatConsentInputError,
  captureChatEntryConsent,
  createContactConsentStore,
  type CaptureContactConsentInput,
} from "./consent";

const NOW = new Date("2026-10-10T00:00:00.000Z");
const EMAIL = "ana@example.com";
const PHONE = "+57 300 000 0000";

type ConsentRow = {
  id: string;
  channel: string;
  value: string;
  state: "granted" | "revoked";
  textVersion: string;
  source: string;
  grantedAt: Date | null;
  revokedAt: Date | null;
};

/**
 * Stateful fake of the consent table: it applies the three statements the DAL
 * issues so capture → eligibility → revocation can be exercised as one flow.
 */
class FakeConsentPool {
  readonly rows = new Map<string, ConsentRow>();
  readonly executed: Array<{ sql: string; params: readonly unknown[] }> = [];

  private key(channel: unknown, value: unknown): string {
    return `${String(channel)}:${String(value)}`;
  }

  async execute(
    sql: string,
    params: readonly unknown[]
  ): Promise<[unknown, unknown[]]> {
    this.executed.push({ sql, params: [...params] });

    if (sql.startsWith("INSERT INTO chat_contact_consents")) {
      const [id, channel, value, textVersion, source, grantedAt] = params as [
        string,
        string,
        string,
        string,
        string,
        Date,
      ];
      const existing = this.rows.get(this.key(channel, value));
      this.rows.set(this.key(channel, value), {
        id,
        channel,
        value,
        state: "granted",
        textVersion,
        source,
        grantedAt,
        revokedAt: null,
      });
      return [{ affectedRows: existing ? 2 : 1, insertId: 0 }, []];
    }

    if (sql.includes("SET consent_state = 'revoked'")) {
      const [revokedAt, , channel, value] = params as [Date, Date, string, string];
      const row = this.rows.get(this.key(channel, value));
      if (!row || row.state !== "granted") return [{ affectedRows: 0 }, []];
      row.state = "revoked";
      row.revokedAt = revokedAt;
      return [{ affectedRows: 1 }, []];
    }

    if (sql.startsWith("SELECT")) {
      const [channel, value] = params as [string, string];
      const row = this.rows.get(this.key(channel, value));
      const eligible =
        row !== undefined && row.state === "granted" && row.revokedAt === null;
      return [eligible ? [{ present: 1 }] : [], []];
    }

    throw new Error("unexpected SQL in fake consent pool");
  }
}

function createPool(): { pool: Pool; fake: FakeConsentPool } {
  const fake = new FakeConsentPool();
  return { pool: fake as unknown as Pool, fake };
}

async function capture(pool: Pool, overrides: Record<string, unknown> = {}) {
  const store = createContactConsentStore(pool);
  const input = {
    id: "8b7d2a44-1111-4222-8333-444455556666",
    channel: "email",
    contactValue: EMAIL,
    textVersion: CHAT_CONSENT_TEXT_VERSION,
    source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
    now: NOW,
    ...overrides,
  } as unknown as CaptureContactConsentInput;
  await store.capture(input);
  return store;
}

describe("consent constants", () => {
  it("pins a text version, an entry source and the two approved channels", () => {
    expect(CHAT_CONSENT_TEXT_VERSION).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
    expect(CHAT_CONSENT_SOURCE_CHAT_ENTRY).toMatch(/^[a-z0-9_-]{1,64}$/);
    expect([...CHAT_CONTACT_CHANNELS]).toEqual(["email", "whatsapp"]);
    expect(CHAT_CONTACT_VALUE_MAX_LENGTH).toBeLessThanOrEqual(320);
  });
});

describe("createContactConsentStore — capture", () => {
  it("persists a granted consent with version, timestamp, source and channel", async () => {
    const { pool, fake } = createPool();

    await capture(pool);

    expect(fake.executed).toHaveLength(1);
    const [{ sql, params }] = fake.executed;
    expect(sql).toContain("INSERT INTO chat_contact_consents");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(sql).toContain("consent_text_version");
    expect(sql).toContain("consent_state");
    expect(sql).toContain("granted_at");
    expect(sql).toContain("source");
    expect(params).toEqual([
      "8b7d2a44-1111-4222-8333-444455556666",
      "email",
      EMAIL,
      CHAT_CONSENT_TEXT_VERSION,
      CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      NOW,
      NOW,
      NOW,
      CHAT_CONSENT_TEXT_VERSION,
      CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      NOW,
      NOW,
    ]);
  });

  it("keeps one row per contact (unique channel + value upsert)", async () => {
    const { pool, fake } = createPool();
    const store = await capture(pool);
    await store.capture({
      id: "11111111-2222-4333-8444-555566667777",
      channel: "email",
      contactValue: EMAIL,
      textVersion: CHAT_CONSENT_TEXT_VERSION,
      source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      now: new Date(NOW.getTime() + 1000),
    });

    expect(fake.rows.size).toBe(1);
    expect(fake.rows.get(`email:${EMAIL}`)?.state).toBe("granted");
    expect(fake.executed.every((entry) => entry.sql.includes("ON DUPLICATE KEY UPDATE"))).toBe(
      true
    );
  });

  it("binds every value as a parameter and never interpolates PII", async () => {
    const { pool, fake } = createPool();

    await capture(pool);

    const [{ sql }] = fake.executed;
    expect(sql).not.toContain(EMAIL);
    expect(sql).not.toContain("@");
    expect(sql).not.toContain(CHAT_CONSENT_TEXT_VERSION);
    expect(sql).not.toContain(CHAT_CONSENT_SOURCE_CHAT_ENTRY);
    expect(sql).not.toContain("2026-");
    const placeholders = (sql.match(/\?/g) ?? []).length;
    expect(placeholders).toBe(fake.executed[0].params.length);
  });

  it("never touches conversation data", async () => {
    const { pool, fake } = createPool();

    await capture(pool);

    for (const entry of fake.executed) {
      expect(entry.sql).not.toContain("chat_conversations");
      expect(entry.sql).not.toContain("chat_messages");
    }
  });

  it.each([
    ["unsupported channel", { channel: "sms" }],
    ["empty contact", { contactValue: "" }],
    ["oversized contact", { contactValue: "a".repeat(CHAT_CONTACT_VALUE_MAX_LENGTH + 1) }],
    ["whitespace-padded contact", { contactValue: ` ${EMAIL} ` }],
    ["empty text version", { textVersion: "" }],
    ["empty source", { source: "" }],
  ])("rejects %s before touching the database", async (_label, overrides) => {
    const { pool, fake } = createPool();
    const store = createContactConsentStore(pool);

    await expect(
      store.capture({
        id: "8b7d2a44-1111-4222-8333-444455556666",
        channel: "email",
        contactValue: EMAIL,
        textVersion: CHAT_CONSENT_TEXT_VERSION,
        source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
        now: NOW,
        ...overrides,
      } as unknown as CaptureContactConsentInput)
    ).rejects.toBeInstanceOf(ChatConsentInputError);
    expect(fake.executed).toHaveLength(0);
  });

  it("rejects a non-string contact value", async () => {
    const { pool, fake } = createPool();
    const store = createContactConsentStore(pool);

    await expect(
      store.capture({
        id: "8b7d2a44-1111-4222-8333-444455556666",
        channel: "email",
        contactValue: undefined as unknown as string,
        textVersion: CHAT_CONSENT_TEXT_VERSION,
        source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
        now: NOW,
      })
    ).rejects.toBeInstanceOf(ChatConsentInputError);
    expect(fake.executed).toHaveLength(0);
  });
});

describe("createContactConsentStore — revocation and eligibility", () => {
  it("marks the consent revoked with revoked_at and drops eligibility immediately", async () => {
    const { pool, fake } = createPool();
    const store = await capture(pool);

    expect(await store.isCommerciallyEligible({ channel: "email", contactValue: EMAIL })).toBe(
      true
    );

    const revokedAt = new Date(NOW.getTime() + 60_000);
    const revoked = await store.revoke({
      channel: "email",
      contactValue: EMAIL,
      now: revokedAt,
    });

    expect(revoked).toBe(true);
    const row = fake.rows.get(`email:${EMAIL}`);
    expect(row?.state).toBe("revoked");
    expect(row?.revokedAt).toEqual(revokedAt);
    expect(await store.isCommerciallyEligible({ channel: "email", contactValue: EMAIL })).toBe(
      false
    );
  });

  it("is idempotent: revoking twice keeps a single revocation timestamp", async () => {
    const { pool, fake } = createPool();
    const store = await capture(pool);

    const first = await store.revoke({ channel: "email", contactValue: EMAIL, now: NOW });
    const firstRevokedAt = fake.rows.get(`email:${EMAIL}`)?.revokedAt;
    const second = await store.revoke({
      channel: "email",
      contactValue: EMAIL,
      now: new Date(NOW.getTime() + 5000),
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(fake.rows.get(`email:${EMAIL}`)?.revokedAt).toEqual(firstRevokedAt);
    expect(await store.isCommerciallyEligible({ channel: "email", contactValue: EMAIL })).toBe(
      false
    );
  });

  it("revokes and checks eligibility only through bound parameters", async () => {
    const { pool, fake } = createPool();
    const store = await capture(pool);
    await store.revoke({ channel: "email", contactValue: EMAIL, now: NOW });
    await store.isCommerciallyEligible({ channel: "email", contactValue: EMAIL });

    for (const entry of fake.executed) {
      expect(entry.sql).not.toContain(EMAIL);
      expect(entry.sql).not.toContain("ana");
      expect(entry.params).toContain(EMAIL);
    }
    const select = fake.executed.at(-1);
    expect(select?.sql).toContain("consent_state = 'granted'");
    expect(select?.sql).toContain("revoked_at IS NULL");
    expect(select?.sql).toContain("LIMIT 1");
  });

  it("reports a never-captured contact as not eligible", async () => {
    const { pool } = createPool();
    const store = createContactConsentStore(pool);

    expect(await store.isCommerciallyEligible({ channel: "email", contactValue: EMAIL })).toBe(
      false
    );
    expect(await store.revoke({ channel: "email", contactValue: EMAIL, now: NOW })).toBe(false);
  });

  it("keeps channels independent for the same value", async () => {
    const { pool } = createPool();
    const store = createContactConsentStore(pool);
    await store.capture({
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      channel: "whatsapp",
      contactValue: PHONE,
      textVersion: CHAT_CONSENT_TEXT_VERSION,
      source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      now: NOW,
    });

    expect(await store.isCommerciallyEligible({ channel: "whatsapp", contactValue: PHONE })).toBe(
      true
    );
    expect(await store.isCommerciallyEligible({ channel: "email", contactValue: PHONE })).toBe(
      false
    );
  });
});

describe("captureChatEntryConsent — visitor entry wiring", () => {
  it("captures the email channel and the whatsapp channel when a phone exists", async () => {
    const { pool } = createPool();
    const store = createContactConsentStore(pool);
    const spy = vi.spyOn(store, "capture");

    await captureChatEntryConsent({ store, email: EMAIL, phone: PHONE, now: NOW });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toMatchObject({
      channel: "email",
      contactValue: EMAIL,
      textVersion: CHAT_CONSENT_TEXT_VERSION,
      source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      now: NOW,
    });
    expect(spy.mock.calls[1][0]).toMatchObject({
      channel: "whatsapp",
      contactValue: PHONE,
      textVersion: CHAT_CONSENT_TEXT_VERSION,
      source: CHAT_CONSENT_SOURCE_CHAT_ENTRY,
      now: NOW,
    });
    expect(spy.mock.calls[0][0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(spy.mock.calls[0][0].id).not.toBe(spy.mock.calls[1][0].id);
  });

  it("captures only the email channel when the phone is absent", async () => {
    const { pool } = createPool();
    const store = createContactConsentStore(pool);
    const spy = vi.spyOn(store, "capture");

    await captureChatEntryConsent({ store, email: EMAIL, phone: null, now: NOW });
    await captureChatEntryConsent({ store, email: EMAIL, now: NOW });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0].channel).toBe("email");
    expect(spy.mock.calls[1][0].channel).toBe("email");
  });

  it("propagates a store failure so the caller decides it is best-effort", async () => {
    const failing = {
      capture: vi.fn().mockRejectedValue(new Error("db down")),
      revoke: vi.fn(),
      isCommerciallyEligible: vi.fn(),
    };

    await expect(
      captureChatEntryConsent({ store: failing, email: EMAIL, now: NOW })
    ).rejects.toThrow("db down");
  });
});
