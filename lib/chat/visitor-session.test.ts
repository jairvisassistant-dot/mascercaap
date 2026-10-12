import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import type { Pool } from "mysql2/promise";

import {
  CHAT_SESSION_DEFAULT_TTL_SECONDS,
  CHAT_SESSION_SECRET_MIN_LENGTH,
  CHAT_SESSION_TTL_MAX_SECONDS,
  CHAT_SESSION_TTL_MIN_SECONDS,
  CHAT_VISITOR_SESSION_COOKIE_MAX_LENGTH,
  CHAT_VISITOR_SESSION_COOKIE_NAME,
  ChatSessionConfigError,
  buildVisitorSessionCookieValue,
  createVisitorSessionMaterial,
  createVisitorSessionStore,
  generateVisitorSessionSecret,
  hashVisitorSessionSecret,
  parseVisitorSessionSigningKeys,
  readVisitorSessionSecret,
  resolveVisitorSession,
  resolveVisitorSessionTtl,
  visitorSessionCookieOptions,
  type VisitorSessionRecord,
  type VisitorSessionSigningKeys,
  type VisitorSessionStore,
} from "./visitor-session";

import {
  CHAT_MESSAGE_BODY_MAX_LENGTH,
  CHAT_VISITOR_NAME_MAX_LENGTH,
} from "./types";
import {
  chatEntrySchema,
  clientMessageSchema,
  decodeChatCursor,
  encodeChatCursor,
} from "./validation";

const CONVERSATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const OTHER_CONVERSATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const KEY_A = "a".repeat(CHAT_SESSION_SECRET_MIN_LENGTH);
const KEY_B = "b".repeat(CHAT_SESSION_SECRET_MIN_LENGTH + 8);

function keys(...raw: string[]): VisitorSessionSigningKeys {
  return parseVisitorSessionSigningKeys(raw.join(","));
}

describe("generateVisitorSessionSecret", () => {
  it("produces 256 bits of opaque randomness", () => {
    const secret = generateVisitorSessionSecret();

    expect(Buffer.from(secret, "base64url").length).toBe(32);
  });

  it("is unique per call", () => {
    const secrets = new Set(
      Array.from({ length: 50 }, () => generateVisitorSessionSecret())
    );

    expect(secrets.size).toBe(50);
  });

  it("never contains a conversation id", () => {
    const secret = generateVisitorSessionSecret();

    expect(secret).not.toContain(CONVERSATION_ID);
  });
});

describe("hashVisitorSessionSecret", () => {
  it("returns a 64-character lowercase hex digest", () => {
    const hash = hashVisitorSessionSecret("some-secret");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toHaveLength(64);
  });

  it("is deterministic and differs per secret", () => {
    expect(hashVisitorSessionSecret("a")).toBe(hashVisitorSessionSecret("a"));
    expect(hashVisitorSessionSecret("a")).not.toBe(
      hashVisitorSessionSecret("b")
    );
  });
});

describe("parseVisitorSessionSigningKeys — rotation", () => {
  it("treats the first key as active and keeps every key for verification", () => {
    const parsed = keys(KEY_A, KEY_B);

    expect(parsed.active).toBe(KEY_A);
    expect(parsed.all).toEqual([KEY_A, KEY_B]);
  });

  it("accepts a single key", () => {
    const parsed = keys(KEY_A);

    expect(parsed.active).toBe(KEY_A);
    expect(parsed.all).toEqual([KEY_A]);
  });

  it("trims whitespace and drops empty entries", () => {
    const parsed = parseVisitorSessionSigningKeys(` ${KEY_A} , ,${KEY_B}, `);

    expect(parsed.all).toEqual([KEY_A, KEY_B]);
  });

  it("deduplicates repeated keys while preserving order", () => {
    const parsed = parseVisitorSessionSigningKeys(`${KEY_A},${KEY_B},${KEY_A}`);

    expect(parsed.all).toEqual([KEY_A, KEY_B]);
  });

  it("rejects a missing or blank secret", () => {
    expect(() => parseVisitorSessionSigningKeys(undefined)).toThrow(
      ChatSessionConfigError
    );
    expect(() => parseVisitorSessionSigningKeys("   ")).toThrow(
      ChatSessionConfigError
    );
  });

  it("rejects a key shorter than the minimum length", () => {
    expect(() =>
      parseVisitorSessionSigningKeys("short-key")
    ).toThrow(ChatSessionConfigError);
  });

  it("never echoes the secret value in the error message", () => {
    const weak = "weak-secret";
    try {
      parseVisitorSessionSigningKeys(weak);
      throw new Error("expected a config error");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatSessionConfigError);
      expect((error as Error).message).not.toContain(weak);
    }
  });
});

describe("cookie value signing — integrity and generic failure", () => {
  it("round-trips a signed secret", () => {
    const secret = generateVisitorSessionSecret();
    const signingKeys = keys(KEY_A);

    const cookieValue = buildVisitorSessionCookieValue(secret, signingKeys);

    expect(readVisitorSessionSecret(cookieValue, signingKeys)).toBe(secret);
  });

  it("verifies a value signed with a previous (non-active) key", () => {
    const secret = generateVisitorSessionSecret();
    const oldKeys = keys(KEY_B);
    const rotatedKeys = keys(KEY_A, KEY_B);

    const cookieValue = buildVisitorSessionCookieValue(secret, oldKeys);

    expect(readVisitorSessionSecret(cookieValue, rotatedKeys)).toBe(secret);
  });

  it("rejects a value signed with a key that was rotated out", () => {
    const secret = generateVisitorSessionSecret();
    const cookieValue = buildVisitorSessionCookieValue(secret, keys(KEY_B));

    expect(readVisitorSessionSecret(cookieValue, keys(KEY_A))).toBeNull();
  });

  it("rejects a tampered secret body while keeping the signature", () => {
    const signingKeys = keys(KEY_A);
    const cookieValue = buildVisitorSessionCookieValue(
      generateVisitorSessionSecret(),
      signingKeys
    );
    const [version, , signature] = cookieValue.split(".");
    const tampered = `${version}.${generateVisitorSessionSecret()}.${signature}`;

    expect(readVisitorSessionSecret(tampered, signingKeys)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const signingKeys = keys(KEY_A);
    const cookieValue = buildVisitorSessionCookieValue(
      generateVisitorSessionSecret(),
      signingKeys
    );
    const [version, secret] = cookieValue.split(".");
    const tampered = `${version}.${secret}.${"x".repeat(43)}`;

    expect(readVisitorSessionSecret(tampered, signingKeys)).toBeNull();
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty", ""],
    ["no separators", "not-a-cookie"],
    ["wrong version", `v2.${"a".repeat(43)}.${"b".repeat(43)}`],
    ["too many segments", `v1.a.b.c`],
  ])("returns null (never throws) for a malformed cookie (%s)", (_label, value) => {
    expect(readVisitorSessionSecret(value, keys(KEY_A))).toBeNull();
  });

  it("rejects an over-long cookie value before hashing", () => {
    const oversized = "v1." + "a".repeat(CHAT_VISITOR_SESSION_COOKIE_MAX_LENGTH) + ".sig";

    expect(readVisitorSessionSecret(oversized, keys(KEY_A))).toBeNull();
  });
});

describe("visitorSessionCookieOptions", () => {
  it("sets production-safe attributes and the TTL", () => {
    const options = visitorSessionCookieOptions({
      ttlSeconds: 3600,
      secure: true,
    });

    expect(options.name).toBe(CHAT_VISITOR_SESSION_COOKIE_NAME);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(3600);
  });

  it("allows secure to be disabled for local http testing only", () => {
    expect(
      visitorSessionCookieOptions({ ttlSeconds: 60, secure: false }).secure
    ).toBe(false);
  });
});

describe("resolveVisitorSessionTtl", () => {
  it("defaults to the documented TTL", () => {
    expect(resolveVisitorSessionTtl({})).toBe(CHAT_SESSION_DEFAULT_TTL_SECONDS);
  });

  it("parses a valid integer within bounds", () => {
    expect(resolveVisitorSessionTtl({ CHAT_SESSION_TTL_SECONDS: "7200" })).toBe(
      7200
    );
  });

  it("clamps out-of-range values", () => {
    expect(
      resolveVisitorSessionTtl({ CHAT_SESSION_TTL_SECONDS: "1" })
    ).toBe(CHAT_SESSION_TTL_MIN_SECONDS);
    expect(
      resolveVisitorSessionTtl({ CHAT_SESSION_TTL_SECONDS: "999999999" })
    ).toBe(CHAT_SESSION_TTL_MAX_SECONDS);
  });

  it("falls back for non-numeric input", () => {
    expect(
      resolveVisitorSessionTtl({ CHAT_SESSION_TTL_SECONDS: "abc" })
    ).toBe(CHAT_SESSION_DEFAULT_TTL_SECONDS);
  });
});

describe("createVisitorSessionMaterial", () => {
  it("hashes the secret and never stores the clear text", () => {
    const now = new Date("2026-10-09T10:00:00.000Z");
    const material = createVisitorSessionMaterial({
      now,
      ttlSeconds: 3600,
      sessionId: "session-id-1",
    });

    expect(material.secret).toBeTruthy();
    expect(material.sessionHash).toBe(hashVisitorSessionSecret(material.secret));
    expect(material.sessionHash).not.toContain(material.secret);
    expect(material.createdAt).toEqual(now);
    expect(material.expiresAt.getTime()).toBe(now.getTime() + 3600_000);
  });

  it("scopes the record to a conversation only when inserted", () => {
    const material = createVisitorSessionMaterial({
      now: new Date("2026-10-09T10:00:00.000Z"),
      ttlSeconds: 60,
    });

    expect(material).not.toHaveProperty("conversationId");
  });
});

// ── resolveVisitorSession ──

class FakeVisitorSessionStore implements VisitorSessionStore {
  private readonly byHash = new Map<string, VisitorSessionRecord>();

  seedSession(record: VisitorSessionRecord): void {
    this.byHash.set(record.sessionHash, record);
  }

  async findActiveByHash(
    sessionHash: string,
    now: Date
  ): Promise<VisitorSessionRecord | null> {
    const record = this.byHash.get(sessionHash);
    if (!record) return null;
    if (record.revokedAt !== null) return null;
    if (record.expiresAt.getTime() <= now.getTime()) return null;
    return record;
  }

  async insert(): Promise<void> {}
  async touch(): Promise<void> {}
  async revokeByHash(): Promise<void> {}
  async revokeAllForConversation(): Promise<void> {}
}

function sessionRecord(overrides: Partial<VisitorSessionRecord> = {}): VisitorSessionRecord {
  return {
    id: "session-1",
    conversationId: CONVERSATION_ID,
    sessionHash: "hash",
    createdAt: new Date("2026-10-09T10:00:00.000Z"),
    lastSeenAt: new Date("2026-10-09T10:00:00.000Z"),
    expiresAt: new Date("2026-10-10T10:00:00.000Z"),
    revokedAt: null,
    ...overrides,
  };
}

describe("resolveVisitorSession", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");

  it("resolves an active session scoped to its own conversation", async () => {
    const signingKeys = keys(KEY_A);
    const secret = generateVisitorSessionSecret();
    const cookieValue = buildVisitorSessionCookieValue(secret, signingKeys);
    const store = new FakeVisitorSessionStore();
    store.seedSession(
      sessionRecord({ sessionHash: hashVisitorSessionSecret(secret) })
    );

    const resolved = await resolveVisitorSession({
      cookieValue,
      signingKeys,
      store,
      now,
    });

    expect(resolved).toEqual({
      sessionId: "session-1",
      conversationId: CONVERSATION_ID,
    });
  });

  it("derives the conversation scope only from the server store, not the cookie", async () => {
    const signingKeys = keys(KEY_A);
    const secret = generateVisitorSessionSecret();
    const cookieValue = buildVisitorSessionCookieValue(secret, signingKeys);
    const store = new FakeVisitorSessionStore();
    store.seedSession(
      sessionRecord({
        sessionHash: hashVisitorSessionSecret(secret),
        conversationId: OTHER_CONVERSATION_ID,
      })
    );

    const resolved = await resolveVisitorSession({
      cookieValue,
      signingKeys,
      store,
      now,
    });

    expect(cookieValue).not.toContain(OTHER_CONVERSATION_ID);
    expect(resolved?.conversationId).toBe(OTHER_CONVERSATION_ID);
  });

  it("returns null for a forged cookie", async () => {
    const store = new FakeVisitorSessionStore();

    const resolved = await resolveVisitorSession({
      cookieValue: "v1.forged.signature",
      signingKeys: keys(KEY_A),
      store,
      now,
    });

    expect(resolved).toBeNull();
  });

  it("returns null for an expired session", async () => {
    const signingKeys = keys(KEY_A);
    const secret = generateVisitorSessionSecret();
    const store = new FakeVisitorSessionStore();
    store.seedSession(
      sessionRecord({
        sessionHash: hashVisitorSessionSecret(secret),
        expiresAt: new Date("2026-10-09T11:00:00.000Z"),
      })
    );

    const resolved = await resolveVisitorSession({
      cookieValue: buildVisitorSessionCookieValue(secret, signingKeys),
      signingKeys,
      store,
      now,
    });

    expect(resolved).toBeNull();
  });

  it("returns null for a revoked session", async () => {
    const signingKeys = keys(KEY_A);
    const secret = generateVisitorSessionSecret();
    const store = new FakeVisitorSessionStore();
    store.seedSession(
      sessionRecord({
        sessionHash: hashVisitorSessionSecret(secret),
        revokedAt: new Date("2026-10-09T11:00:00.000Z"),
      })
    );

    const resolved = await resolveVisitorSession({
      cookieValue: buildVisitorSessionCookieValue(secret, signingKeys),
      signingKeys,
      store,
      now,
    });

    expect(resolved).toBeNull();
  });

  it("fails closed (null) when the store throws, without leaking the error", async () => {
    const signingKeys = keys(KEY_A);
    const secret = generateVisitorSessionSecret();
    const store = new FakeVisitorSessionStore();
    vi.spyOn(store, "findActiveByHash").mockRejectedValue(
      new Error("db down")
    );

    const resolved = await resolveVisitorSession({
      cookieValue: buildVisitorSessionCookieValue(secret, signingKeys),
      signingKeys,
      store,
      now,
    });

    expect(resolved).toBeNull();
  });
});

// ── Real mysql2 adapter (exercised through a mocked pool) ──

type FakeQueryResult = [unknown[], unknown[]];

function createSessionFakePool() {
  const query = vi.fn<(...args: unknown[]) => Promise<unknown>>(
    async () => [[], []] as FakeQueryResult
  );
  const execute = vi.fn<(...args: unknown[]) => Promise<unknown>>(
    async () => [{ affectedRows: 1 }, []]
  );
  const pool = { query, execute };
  return { pool, query, execute };
}

describe("createVisitorSessionStore", () => {
  it("looks up an active session by hash with bound parameters and no interpolation", async () => {
    const { pool, query } = createSessionFakePool();
    const store = createVisitorSessionStore(pool as unknown as Pool);
    const now = new Date("2026-10-09T12:00:00.000Z");

    await store.findActiveByHash("deadbeef", now);

    const [call] = query.mock.calls;
    expect(String(call[0])).toContain("FROM visitor_chat_sessions");
    expect(String(call[0])).toContain("revoked_at IS NULL");
    expect(String(call[0])).toContain("expires_at > ?");
    expect(String(call[0])).not.toContain("deadbeef");
    expect(call[1]).toEqual(["deadbeef", now]);
  });

  it("inserts a new session row with every value bound", async () => {
    const { pool, execute } = createSessionFakePool();
    const store = createVisitorSessionStore(pool as unknown as Pool);
    const record = {
      id: "session-1",
      conversationId: CONVERSATION_ID,
      sessionHash: "hash-1",
      createdAt: new Date("2026-10-09T10:00:00.000Z"),
      lastSeenAt: new Date("2026-10-09T10:00:00.000Z"),
      expiresAt: new Date("2026-10-10T10:00:00.000Z"),
    };

    await store.insert(record);

    const [call] = execute.mock.calls;
    expect(String(call[0])).toContain("INSERT INTO visitor_chat_sessions");
    expect(String(call[0])).not.toContain(CONVERSATION_ID);
    expect(call[1]).toEqual([
      "session-1",
      CONVERSATION_ID,
      "hash-1",
      record.createdAt,
      record.lastSeenAt,
      record.expiresAt,
    ]);
  });

  it("revokes every active session for a conversation with bound parameters", async () => {
    const { pool, execute } = createSessionFakePool();
    const store = createVisitorSessionStore(pool as unknown as Pool);
    const revokedAt = new Date("2026-10-09T12:00:00.000Z");

    await store.revokeAllForConversation(CONVERSATION_ID, revokedAt);

    const [call] = execute.mock.calls;
    expect(String(call[0])).toContain("UPDATE visitor_chat_sessions");
    expect(String(call[0])).toContain("SET revoked_at = ?");
    expect(String(call[0])).toContain("conversation_id = ?");
    expect(String(call[0])).not.toContain(CONVERSATION_ID);
    expect(call[1]).toEqual([revokedAt, CONVERSATION_ID]);
  });
});

// ── Visitor-facing validation schemas ──

describe("chatEntrySchema", () => {
  it("accepts a valid entry with an optional phone and default consent", () => {
    const parsed = chatEntrySchema.parse({
      name: "Maria",
      email: "maria@example.com",
    });

    expect(parsed.marketingConsent).toBe(false);
    expect(parsed.phone).toBeUndefined();
  });

  it("accepts an explicit consent and a phone", () => {
    const parsed = chatEntrySchema.parse({
      name: "Maria",
      email: "maria@example.com",
      phone: "+57 300 123 4567",
      marketingConsent: true,
    });

    expect(parsed.marketingConsent).toBe(true);
    expect(parsed.phone).toBe("+57 300 123 4567");
  });

  it("rejects a name shorter than two characters", () => {
    expect(
      chatEntrySchema.safeParse({ name: "M", email: "a@b.co" }).success
    ).toBe(false);
  });

  it("rejects a name longer than the documented bound", () => {
    expect(
      chatEntrySchema.safeParse({
        name: "x".repeat(CHAT_VISITOR_NAME_MAX_LENGTH + 1),
        email: "a@b.co",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      chatEntrySchema.safeParse({ name: "Maria", email: "not-an-email" }).success
    ).toBe(false);
  });

  it("rejects unknown fields (identity spoofing surface)", () => {
    expect(
      chatEntrySchema.safeParse({
        name: "Maria",
        email: "a@b.co",
        senderType: "operator",
      }).success
    ).toBe(false);
  });

  it("rejects control characters in the name (plain text only)", () => {
    expect(
      chatEntrySchema.safeParse({
        name: "Ma\u0000ria",
        email: "a@b.co",
      }).success
    ).toBe(false);
  });
});

describe("clientMessageSchema", () => {
  const valid = { body: "Hola", clientMessageId: "abcdefgh1234" };

  it("accepts a bounded plain-text message", () => {
    expect(clientMessageSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty or whitespace-only body", () => {
    expect(
      clientMessageSchema.safeParse({ ...valid, body: "   " }).success
    ).toBe(false);
  });

  it("rejects a body longer than the documented bound", () => {
    expect(
      clientMessageSchema.safeParse({
        ...valid,
        body: "x".repeat(CHAT_MESSAGE_BODY_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it("rejects control characters in the body (plain text only)", () => {
    expect(
      clientMessageSchema.safeParse({ ...valid, body: "hi\u0007there" }).success
    ).toBe(false);
  });

  it("rejects an id outside the allowed alphabet", () => {
    expect(
      clientMessageSchema.safeParse({ ...valid, clientMessageId: "bad id!" })
        .success
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(
      clientMessageSchema.safeParse({ ...valid, senderType: "operator" })
        .success
    ).toBe(false);
  });
});

describe("chat cursor", () => {
  const cursor = {
    createdAt: "2026-10-09T10:00:00.000Z",
    id: CONVERSATION_ID,
  };

  it("round-trips through an opaque encoding", () => {
    const encoded = encodeChatCursor(cursor);

    expect(encoded).not.toContain(CONVERSATION_ID);
    expect(decodeChatCursor(encoded)).toEqual(cursor);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["empty", ""],
    ["non-base64 json", "not base64 !!@"],
    ["valid base64, wrong shape", Buffer.from(JSON.stringify({ a: 1 })).toString("base64url")],
  ])("returns null for a malformed cursor (%s)", (_label, raw) => {
    expect(decodeChatCursor(raw)).toBeNull();
  });
});
