import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import type { Pool } from "mysql2/promise";

import {
  CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS,
  CHAT_RESUME_TOKEN_TTL_MAX_SECONDS,
  CHAT_RESUME_TOKEN_TTL_MIN_SECONDS,
  RESUME_TOKEN_QUERY_PARAM,
  buildResumeLink,
  createResumeTokenStore,
  generateResumeToken,
  hashResumeToken,
  isResumeTokenUsable,
  resolveResumeTokenTtl,
  type ResumeTokenRecord,
} from "./resume-token";
import { hashVisitorSessionSecret } from "./visitor-session";

const CONVERSATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("generateResumeToken", () => {
  it("produces 256 bits of opaque randomness", () => {
    expect(Buffer.from(generateResumeToken(), "base64url").length).toBe(32);
  });

  it("is unique per call", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateResumeToken())
    );
    expect(tokens.size).toBe(50);
  });

  it("never encodes the conversation id", () => {
    const token = generateResumeToken();

    expect(token).not.toContain(CONVERSATION_ID);
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain(
      CONVERSATION_ID
    );
  });
});

describe("hashResumeToken", () => {
  it("returns a 64-character lowercase hex digest", () => {
    expect(hashResumeToken("token")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic and differs per token", () => {
    expect(hashResumeToken("a")).toBe(hashResumeToken("a"));
    expect(hashResumeToken("a")).not.toBe(hashResumeToken("b"));
  });

  it("matches the SHA-256 helper used for sessions (same hash family)", () => {
    expect(hashResumeToken("x")).toBe(hashVisitorSessionSecret("x"));
  });
});

describe("resolveResumeTokenTtl", () => {
  it("defaults to seven days", () => {
    expect(resolveResumeTokenTtl({})).toBe(
      CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS
    );
    expect(CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS).toBe(604_800);
  });

  it("clamps out-of-range values", () => {
    expect(resolveResumeTokenTtl({ CHAT_RESUME_TOKEN_TTL_SECONDS: "1" })).toBe(
      CHAT_RESUME_TOKEN_TTL_MIN_SECONDS
    );
    expect(
      resolveResumeTokenTtl({ CHAT_RESUME_TOKEN_TTL_SECONDS: "999999999" })
    ).toBe(CHAT_RESUME_TOKEN_TTL_MAX_SECONDS);
  });

  it("falls back for non-numeric input", () => {
    expect(
      resolveResumeTokenTtl({ CHAT_RESUME_TOKEN_TTL_SECONDS: "nope" })
    ).toBe(CHAT_RESUME_TOKEN_DEFAULT_TTL_SECONDS);
  });
});

describe("buildResumeLink", () => {
  const token = generateResumeToken();

  it("builds a localized link with the token in a query parameter", () => {
    const url = new URL(
      buildResumeLink({ origin: "https://mascercaap.com", lang: "es", token })
    );

    expect(url.pathname).toBe("/es/chat");
    expect(url.searchParams.get(RESUME_TOKEN_QUERY_PARAM)).toBe(token);
  });

  it("does not leak the conversation id", () => {
    const link = buildResumeLink({
      origin: "https://mascercaap.com",
      lang: "en",
      token,
    });

    expect(link).not.toContain(CONVERSATION_ID);
  });

  it("falls back to the default locale for an unsafe lang segment", () => {
    const url = new URL(
      buildResumeLink({
        origin: "https://mascercaap.com/",
        lang: "../evil",
        token,
      })
    );

    expect(url.pathname).toBe("/es/chat");
  });
});

describe("isResumeTokenUsable", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");

  function record(overrides: Partial<ResumeTokenRecord> = {}): ResumeTokenRecord {
    return {
      conversationId: CONVERSATION_ID,
      purpose: "resume",
      expiresAt: new Date("2026-10-16T12:00:00.000Z"),
      usedAt: null,
      revokedAt: null,
      ...overrides,
    };
  }

  it("accepts a fresh, unused, unrevoked resume token", () => {
    expect(isResumeTokenUsable(record(), now)).toBe(true);
  });

  it("rejects a reused token", () => {
    expect(
      isResumeTokenUsable(record({ usedAt: new Date("2026-10-09T11:00:00.000Z") }), now)
    ).toBe(false);
  });

  it("rejects a revoked token", () => {
    expect(
      isResumeTokenUsable(
        record({ revokedAt: new Date("2026-10-09T11:00:00.000Z") }),
        now
      )
    ).toBe(false);
  });

  it("rejects an expired token", () => {
    expect(
      isResumeTokenUsable(
        record({ expiresAt: new Date("2026-10-09T11:59:59.000Z") }),
        now
      )
    ).toBe(false);
  });

  it("rejects a token whose purpose is not resume", () => {
    expect(isResumeTokenUsable(record({ purpose: "other" }), now)).toBe(false);
  });
});

// ── Real mysql2 adapter (exercised through a mocked pool) ──

type FakeQueryResult = [unknown[], unknown[]];

const NEW_SESSION = {
  id: "session-1",
  sessionHash: hashVisitorSessionSecret("new-secret"),
  createdAt: new Date("2026-10-09T12:00:00.000Z"),
  lastSeenAt: new Date("2026-10-09T12:00:00.000Z"),
  expiresAt: new Date("2026-11-08T12:00:00.000Z"),
};

function createResumeFakePool(options: {
  claimAffectedRows: number;
  conversationRows: unknown[];
  throwOn?: string;
}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const connection = {
    beginTransaction: vi.fn(async () => undefined),
    execute: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql: String(sql), params: [...params] });
      if (options.throwOn && String(sql).includes(options.throwOn)) {
        throw new Error("simulated failure");
      }
      return [{ affectedRows: options.claimAffectedRows }, []];
    }),
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql: String(sql), params: [...params] });
      return [options.conversationRows, []] as FakeQueryResult;
    }),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
  };
  const pool = { getConnection: vi.fn(async () => connection) };
  return { pool, connection, calls };
}

const NOW = new Date("2026-10-09T12:00:00.000Z");

describe("createResumeTokenStore — atomic redeem", () => {
  it("claims, resolves the conversation, replaces the session and commits", async () => {
    const { pool, connection } = createResumeFakePool({
      claimAffectedRows: 1,
      conversationRows: [{ conversation_id: CONVERSATION_ID }],
    });
    const store = createResumeTokenStore(pool as unknown as Pool);

    const result = await store.redeem({
      tokenHash: "hash-1",
      now: NOW,
      newSession: NEW_SESSION,
    });

    expect(result).toEqual({
      ok: true,
      conversationId: CONVERSATION_ID,
      sessionId: "session-1",
    });
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("uses a single conditional UPDATE that blocks reuse, revocation and expiry", async () => {
    const { pool, calls } = createResumeFakePool({
      claimAffectedRows: 1,
      conversationRows: [{ conversation_id: CONVERSATION_ID }],
    });
    const store = createResumeTokenStore(pool as unknown as Pool);

    await store.redeem({ tokenHash: "hash-1", now: NOW, newSession: NEW_SESSION });

    const claim = calls[0];
    expect(claim.sql).toContain("UPDATE chat_resume_tokens");
    expect(claim.sql).toContain("used_at IS NULL");
    expect(claim.sql).toContain("revoked_at IS NULL");
    expect(claim.sql).toContain("expires_at >");
    expect(claim.sql).toContain("purpose = 'resume'");
    expect(claim.sql).not.toContain("hash-1");
    expect(claim.params).toContain("hash-1");
    expect(claim.params).toContain(NOW);
  });

  it("revokes existing sessions for the conversation before inserting the new one", async () => {
    const { pool, calls } = createResumeFakePool({
      claimAffectedRows: 1,
      conversationRows: [{ conversation_id: CONVERSATION_ID }],
    });
    const store = createResumeTokenStore(pool as unknown as Pool);

    await store.redeem({ tokenHash: "hash-1", now: NOW, newSession: NEW_SESSION });

    const revoke = calls.find((c) => c.sql.includes("SET revoked_at = ?"));
    const insert = calls.find((c) =>
      c.sql.includes("INSERT INTO visitor_chat_sessions")
    );
    expect(revoke).toBeDefined();
    expect(insert).toBeDefined();
    expect(calls.indexOf(revoke!)).toBeLessThan(calls.indexOf(insert!));
    expect(revoke!.params).toEqual([NOW, CONVERSATION_ID]);
    // The hash is bound as a parameter, never interpolated into the SQL.
    expect(insert!.params).toContain(NEW_SESSION.sessionHash);
    expect(insert!.sql).not.toContain(NEW_SESSION.sessionHash);
  });

  it("returns a generic failure and no mutation when the token was already used or purged", async () => {
    const { pool, connection, calls } = createResumeFakePool({
      claimAffectedRows: 0,
      conversationRows: [],
    });
    const store = createResumeTokenStore(pool as unknown as Pool);

    const result = await store.redeem({
      tokenHash: "hash-1",
      now: NOW,
      newSession: NEW_SESSION,
    });

    expect(result).toEqual({ ok: false });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(
      calls.some((c) => c.sql.includes("INSERT INTO visitor_chat_sessions"))
    ).toBe(false);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("returns a generic failure (never throws) when a statement fails", async () => {
    const { pool, connection } = createResumeFakePool({
      claimAffectedRows: 1,
      conversationRows: [{ conversation_id: CONVERSATION_ID }],
      throwOn: "INSERT INTO visitor_chat_sessions",
    });
    const store = createResumeTokenStore(pool as unknown as Pool);

    const result = await store.redeem({
      tokenHash: "hash-1",
      now: NOW,
      newSession: NEW_SESSION,
    });

    expect(result).toEqual({ ok: false });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it("returns a generic failure when the claim succeeds but no conversation row follows", async () => {
    const { pool, connection } = createResumeFakePool({
      claimAffectedRows: 1,
      conversationRows: [],
    });
    const store = createResumeTokenStore(pool as unknown as Pool);

    const result = await store.redeem({
      tokenHash: "hash-1",
      now: NOW,
      newSession: NEW_SESSION,
    });

    expect(result).toEqual({ ok: false });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });
});
