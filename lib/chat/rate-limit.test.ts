import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_RATE_LIMIT_MAX_MESSAGE,
  CHAT_RATE_LIMIT_MAX_OPEN,
  CHAT_RATE_LIMIT_WINDOW_SECONDS,
  computeFixedWindowStart,
  createChatRateLimitStore,
  decideRateLimit,
  enforceChatRateLimit,
  hashRateLimitKey,
  maxRequestsForAction,
  type ChatRateLimitStore,
} from "./rate-limit";

describe("fixed window helpers", () => {
  it("floors the window start to the window boundary in UTC", () => {
    const now = new Date("2026-10-09T12:34:56.789Z");
    expect(computeFixedWindowStart(now, 60).toISOString()).toBe("2026-10-09T12:34:00.000Z");
    expect(computeFixedWindowStart(now, 300).toISOString()).toBe("2026-10-09T12:30:00.000Z");
  });

  it("maps each action to the documented 5/5 limits", () => {
    expect(maxRequestsForAction("conversation_open")).toBe(5);
    expect(maxRequestsForAction("message_send")).toBe(5);
    expect(CHAT_RATE_LIMIT_MAX_OPEN).toBe(5);
    expect(CHAT_RATE_LIMIT_MAX_MESSAGE).toBe(5);
    expect(CHAT_RATE_LIMIT_WINDOW_SECONDS).toBe(60);
  });
});

describe("hashRateLimitKey", () => {
  it("is deterministic and action-scoped without exposing the raw key", () => {
    const first = hashRateLimitKey("message_send", "203.0.113.9");
    expect(first).toBe(hashRateLimitKey("message_send", "203.0.113.9"));
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain("203.0.113.9");
    expect(first).not.toBe(hashRateLimitKey("conversation_open", "203.0.113.9"));
    expect(first).not.toBe(hashRateLimitKey("message_send", "203.0.113.10"));
  });
});

describe("decideRateLimit", () => {
  const windowStart = new Date("2026-10-09T12:34:00.000Z");
  const now = new Date("2026-10-09T12:34:10.000Z");

  it("allows requests at or below the maximum", () => {
    expect(
      decideRateLimit({ count: 5, max: 5, windowStart, windowSeconds: 60, now })
    ).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("denies the request over the maximum with the remaining window time", () => {
    expect(
      decideRateLimit({ count: 6, max: 5, windowStart, windowSeconds: 60, now })
    ).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it("never reports a retry-after below one second", () => {
    const atBoundary = new Date("2026-10-09T12:35:00.000Z");
    expect(
      decideRateLimit({ count: 6, max: 5, windowStart, windowSeconds: 60, now: atBoundary })
        .retryAfterSeconds
    ).toBe(1);
  });
});

describe("enforceChatRateLimit", () => {
  function createStore(count: number): { store: ChatRateLimitStore; increment: ReturnType<typeof vi.fn> } {
    const increment = vi.fn().mockResolvedValue(count);
    return { store: { increment }, increment };
  }

  it("hashes the trusted key and evaluates the returned atomic count", async () => {
    const { store, increment } = createStore(6);
    const now = new Date("2026-10-09T12:34:10.000Z");

    const decision = await enforceChatRateLimit({
      store,
      action: "message_send",
      trustedKey: "conversation-1",
      now,
    });

    expect(decision).toEqual({ allowed: false, retryAfterSeconds: 50 });
    expect(increment).toHaveBeenCalledWith({
      keyHash: hashRateLimitKey("message_send", "conversation-1"),
      action: "message_send",
      windowStart: new Date("2026-10-09T12:34:00.000Z"),
      windowSeconds: 60,
      maxRequests: 5,
      now,
    });
  });

  it("allows the first five opens", async () => {
    const { store } = createStore(1);
    await expect(
      enforceChatRateLimit({ store, action: "conversation_open", trustedKey: "203.0.113.9" })
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("propagates a store failure so the route can fail closed", async () => {
    const store: ChatRateLimitStore = {
      increment: vi.fn().mockRejectedValue(new Error("db down")),
    };
    await expect(
      enforceChatRateLimit({ store, action: "conversation_open", trustedKey: "x" })
    ).rejects.toThrow("db down");
  });
});

describe("createChatRateLimitStore", () => {
  it("uses a single atomic upsert with LAST_INSERT_ID and bound parameters", async () => {
    const execute = vi.fn().mockResolvedValue([{ insertId: 3, affectedRows: 2 }, []]);
    const store = createChatRateLimitStore({ execute } as never);
    const now = new Date("2026-10-09T12:34:10.000Z");
    const windowStart = new Date("2026-10-09T12:34:00.000Z");

    const count = await store.increment({
      keyHash: "deadbeefcafe",
      action: "message_send",
      windowStart,
      windowSeconds: 60,
      maxRequests: 5,
      now,
    });

    expect(count).toBe(3);
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO rate_limit_entries");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(sql).toContain("LAST_INSERT_ID(1)");
    expect(sql).toContain("LAST_INSERT_ID(request_count + 1)");
    expect(params).toEqual(
      expect.arrayContaining(["deadbeefcafe", "message_send", windowStart, 60, 5, now])
    );
    // Never interpolates the hash value into the statement text.
    expect(sql).not.toContain("deadbeefcafe");
  });

  it("returns 1 for a fresh window even when the driver reports 0", async () => {
    const execute = vi.fn().mockResolvedValue([{ insertId: 0, affectedRows: 1 }, []]);
    const store = createChatRateLimitStore({ execute } as never);
    await expect(
      store.increment({
        keyHash: "h",
        action: "conversation_open",
        windowStart: new Date(0),
        windowSeconds: 60,
        maxRequests: 5,
        now: new Date(0),
      })
    ).resolves.toBe(1);
  });
});
