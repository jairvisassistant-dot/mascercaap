import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_DISABLED_STATUS,
  CHAT_MAX_JSON_BODY_BYTES,
  assertChatRequestOrigin,
  chatDisabledResponse,
  chatErrorResponseJson,
  chatJsonResponse,
  chatRateLimitedResponse,
  hasExplicitOrigin,
  isOriginAllowed,
  logChatServerEvent,
  parseAllowedOrigins,
  readBoundedJsonBody,
  readRequestCookie,
  resolveAllowedOrigins,
  resolveRequestVisitorSession,
  resolveTrustedRequestKey,
} from "./http";
import {
  buildVisitorSessionCookieValue,
  parseVisitorSessionSigningKeys,
  type VisitorSessionRecord,
  type VisitorSessionStore,
} from "./visitor-session";

const SECRET = "a".repeat(32);

function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/chat/visitor/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("chat origin allowlist", () => {
  it("parses, trims and de-duplicates a comma-separated allowlist", () => {
    expect(parseAllowedOrigins("https://a.test, https://b.test ,https://a.test,")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });

  it("returns an empty allowlist for missing or blank input (fail closed)", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins("   ")).toEqual([]);
    expect(resolveAllowedOrigins({})).toEqual([]);
  });

  it("never falls back to a hardcoded production origin", () => {
    // No silent production fallback: with no configured allowlist nothing passes,
    // not even the real site origin.
    expect(isOriginAllowed("https://mascercaap.com", resolveAllowedOrigins({}))).toBe(false);
  });

  it("requires an exact, configured origin", () => {
    const allowed = parseAllowedOrigins("https://mascercaap.com");
    expect(isOriginAllowed("https://mascercaap.com", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.test", allowed)).toBe(false);
    expect(isOriginAllowed("https://mascercaap.com.evil.test", allowed)).toBe(false);
    expect(isOriginAllowed(null, allowed)).toBe(false);
    expect(isOriginAllowed("", allowed)).toBe(false);
  });

  it("assertChatRequestOrigin rejects missing/foreign origins with a generic 403", async () => {
    const env = { ALLOWED_ORIGINS: "https://mascercaap.com" };
    const rejected = assertChatRequestOrigin(
      new Request("http://localhost/x", { headers: { origin: "https://evil.test" } }),
      env
    );
    expect(rejected).not.toBeNull();
    expect(rejected?.status).toBe(403);
    expect(rejected?.headers.get("Cache-Control")).toBe("no-store");
    await expect(rejected?.json()).resolves.toEqual({
      success: false,
      error: "chat_request_failed",
    });

    const missing = assertChatRequestOrigin(new Request("http://localhost/x"), env);
    expect(missing?.status).toBe(403);

    const ok = assertChatRequestOrigin(
      new Request("http://localhost/x", { headers: { origin: "https://mascercaap.com" } }),
      env
    );
    expect(ok).toBeNull();
  });

  it("hasExplicitOrigin distinguishes a present non-blank origin from an absent one", () => {
    expect(hasExplicitOrigin("https://mascercaap.com")).toBe(true);
    expect(hasExplicitOrigin("   ")).toBe(false);
    expect(hasExplicitOrigin("")).toBe(false);
    expect(hasExplicitOrigin(null)).toBe(false);
    expect(hasExplicitOrigin(undefined)).toBe(false);
  });

  it("allowAbsentOrigin accepts an absent Origin (same-origin GET) but still rejects an explicit foreign one", async () => {
    const env = { ALLOWED_ORIGINS: "https://mascercaap.com" };
    const readOptions = { allowAbsentOrigin: true } as const;

    // Browsers omit Origin on same-origin GET; an authenticated safe read is allowed.
    const absent = assertChatRequestOrigin(new Request("http://localhost/x"), env, readOptions);
    expect(absent).toBeNull();

    // An explicitly present allowlisted origin is still accepted.
    const allowed = assertChatRequestOrigin(
      new Request("http://localhost/x", { headers: { origin: "https://mascercaap.com" } }),
      env,
      readOptions
    );
    expect(allowed).toBeNull();

    // An explicitly present foreign origin is still rejected: cross-origin reads stay blocked.
    const forbidden = assertChatRequestOrigin(
      new Request("http://localhost/x", { headers: { origin: "https://evil.test" } }),
      env,
      readOptions
    );
    expect(forbidden).not.toBeNull();
    expect(forbidden?.status).toBe(403);
    expect(forbidden?.headers.get("Cache-Control")).toBe("no-store");
    await expect(forbidden?.json()).resolves.toEqual({
      success: false,
      error: "chat_request_failed",
    });
  });

  it("keeps the strict policy as the default so state-changing callers are unaffected", () => {
    const env = { ALLOWED_ORIGINS: "https://mascercaap.com" };
    const missing = assertChatRequestOrigin(new Request("http://localhost/x"), env);
    expect(missing?.status).toBe(403);
  });
});

describe("chat response envelopes", () => {
  it("marks every response no-store and JSON", async () => {
    const res = chatJsonResponse({ success: true, data: { ok: true } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ success: true, data: { ok: true } });
  });

  it("returns the single generic error envelope for every failure status", async () => {
    for (const status of [400, 401, 403, 404, 413, 415, 503]) {
      const res = chatErrorResponseJson(status);
      expect(res.status).toBe(status);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      await expect(res.json()).resolves.toEqual({
        success: false,
        error: "chat_request_failed",
      });
    }
  });

  it("gates the whole module behind a generic disabled response", async () => {
    const res = chatDisabledResponse();
    expect(res.status).toBe(CHAT_DISABLED_STATUS);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "chat_request_failed",
    });
  });

  it("emits Retry-After with a bounded positive integer", async () => {
    const res = chatRateLimitedResponse(42.4);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("43");
    expect(chatRateLimitedResponse(0).headers.get("Retry-After")).toBe("1");
  });
});

describe("readBoundedJsonBody", () => {
  it("parses a valid JSON body", async () => {
    await expect(readBoundedJsonBody(jsonRequest('{"a":1}'))).resolves.toEqual({
      ok: true,
      data: { a: 1 },
    });
  });

  it("rejects a non-JSON content type", async () => {
    await expect(
      readBoundedJsonBody(jsonRequest("a=1", { "Content-Type": "text/plain" }))
    ).resolves.toEqual({ ok: false, reason: "unsupported_media_type" });
  });

  it("rejects invalid JSON", async () => {
    await expect(readBoundedJsonBody(jsonRequest("{not json"))).resolves.toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a body over the declared Content-Length limit", async () => {
    const body = `{"a":"${"x".repeat(CHAT_MAX_JSON_BODY_BYTES + 10)}"}`;
    await expect(readBoundedJsonBody(jsonRequest(body))).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects an over-sized streamed body that declares no Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(CHAT_MAX_JSON_BODY_BYTES + 10)));
        controller.close();
      },
    });
    const request = new Request("http://localhost/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await expect(readBoundedJsonBody(request)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects an empty body", async () => {
    await expect(readBoundedJsonBody(jsonRequest(""))).resolves.toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("readRequestCookie", () => {
  it("reads a named cookie among several", () => {
    const request = new Request("http://localhost/x", {
      headers: { cookie: 'a=1; chat_visitor_session=v1.s.sig; b=2' },
    });
    expect(readRequestCookie(request, "chat_visitor_session")).toBe("v1.s.sig");
  });

  it("returns null for missing cookies and empty values", () => {
    expect(readRequestCookie(new Request("http://localhost/x"), "chat_visitor_session")).toBeNull();
    expect(
      readRequestCookie(
        new Request("http://localhost/x", { headers: { cookie: "chat_visitor_session=" } }),
        "chat_visitor_session"
      )
    ).toBeNull();
  });
});

describe("resolveTrustedRequestKey", () => {
  it("prefers the first forwarded address, then x-real-ip, then anonymous", () => {
    expect(
      resolveTrustedRequestKey(
        new Request("http://localhost/x", {
          headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
        })
      )
    ).toBe("203.0.113.9");
    expect(
      resolveTrustedRequestKey(
        new Request("http://localhost/x", { headers: { "x-real-ip": "198.51.100.7" } })
      )
    ).toBe("198.51.100.7");
    expect(resolveTrustedRequestKey(new Request("http://localhost/x"))).toBe("anonymous");
  });

  it("bounds the trusted key length", () => {
    const long = "9".repeat(400);
    const key = resolveTrustedRequestKey(
      new Request("http://localhost/x", { headers: { "x-real-ip": long } })
    );
    expect(key.length).toBeLessThanOrEqual(128);
  });
});

describe("resolveRequestVisitorSession", () => {
  function createStore(): VisitorSessionStore {
    const record: VisitorSessionRecord = {
      id: "session-1",
      conversationId: "conversation-1",
      sessionHash: "hash",
      createdAt: new Date(0),
      lastSeenAt: new Date(0),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    return {
      findActiveByHash: vi.fn().mockResolvedValue(record),
      insert: vi.fn().mockResolvedValue(undefined),
      touch: vi.fn().mockResolvedValue(undefined),
      revokeByHash: vi.fn().mockResolvedValue(undefined),
      revokeAllForConversation: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("resolves the server-side scope from a valid signed cookie", async () => {
    const keys = parseVisitorSessionSigningKeys(SECRET);
    const cookieValue = buildVisitorSessionCookieValue("opaque-secret", keys);
    const request = new Request("http://localhost/x", {
      headers: { cookie: `chat_visitor_session=${cookieValue}` },
    });

    await expect(
      resolveRequestVisitorSession({ request, signingKeys: keys, store: createStore() })
    ).resolves.toEqual({ sessionId: "session-1", conversationId: "conversation-1" });
  });

  it("resolves to null when the cookie is absent", async () => {
    const keys = parseVisitorSessionSigningKeys(SECRET);
    await expect(
      resolveRequestVisitorSession({
        request: new Request("http://localhost/x"),
        signingKeys: keys,
        store: createStore(),
      })
    ).resolves.toBeNull();
  });
});

describe("logChatServerEvent", () => {
  it("logs only a fixed event code and never request-derived data", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logChatServerEvent("chat_config_error");
    expect(spy).toHaveBeenCalledWith(JSON.stringify({ scope: "chat", event: "chat_config_error" }));
    spy.mockRestore();
  });
});
