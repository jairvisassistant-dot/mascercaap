import { createECDH, verify } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_PUSH_NOTIFICATION_BODY,
  CHAT_PUSH_NOTIFICATION_TITLE,
  buildOperatorPushPayload,
  buildVapidJwt,
  createPushSubscriptionStore,
  createWebPushTransport,
  encryptWebPushPayload,
  resolveVapidConfig,
  sendOperatorPushes,
  type PushSendOutcome,
  type PushSubscriptionRecord,
  type PushTransport,
  type VapidConfig,
} from "./push";

const NOW = new Date("2026-10-10T12:00:00.000Z");

function subscription(overrides: Partial<PushSubscriptionRecord> = {}): PushSubscriptionRecord {
  return {
    id: "sub-1",
    operatorId: "coordinator@example.com",
    endpoint: "https://push.example.net/endpoint-1",
    p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
    auth: "BTBZMqHH6r4Tts7J_aSIgg",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/* ── push payload privacy ─────────────────────────────────────────── */

describe("buildOperatorPushPayload", () => {
  it("produces exactly { unreadCount } and nothing else", () => {
    const payload = buildOperatorPushPayload(3);
    expect(payload).toBe('{"unreadCount":3}');
    expect(JSON.parse(payload)).toEqual({ unreadCount: 3 });
  });

  it("clamps negative, non-integer and oversized counts", () => {
    expect(JSON.parse(buildOperatorPushPayload(-5))).toEqual({ unreadCount: 0 });
    expect(JSON.parse(buildOperatorPushPayload(2.7))).toEqual({ unreadCount: 3 });
    expect(JSON.parse(buildOperatorPushPayload(Number.NaN))).toEqual({ unreadCount: 0 });
    expect(JSON.parse(buildOperatorPushPayload(10_000))).toEqual({ unreadCount: 999 });
  });

  it("uses a fixed title and body with no dynamic personal content", () => {
    expect(CHAT_PUSH_NOTIFICATION_TITLE).toBe("Mas Cerca AP — chat en vivo");
    expect(CHAT_PUSH_NOTIFICATION_BODY).toBe("Tienes mensajes nuevos en la bandeja de chat.");
  });
});

/* ── VAPID configuration ──────────────────────────────────────────── */

const VAPID_ENV = {
  CHAT_VAPID_PUBLIC_KEY: "public-key-value",
  CHAT_VAPID_PRIVATE_KEY: "private-key-value",
  CHAT_VAPID_SUBJECT: "mailto:ops@example.com",
};

describe("resolveVapidConfig", () => {
  it("returns null while any VAPID variable is missing", () => {
    expect(resolveVapidConfig({})).toBeNull();
    expect(
      resolveVapidConfig({
        CHAT_VAPID_PUBLIC_KEY: "pk",
        CHAT_VAPID_PRIVATE_KEY: "sk",
      })
    ).toBeNull();
    expect(
      resolveVapidConfig({
        CHAT_VAPID_PUBLIC_KEY: "pk",
        CHAT_VAPID_SUBJECT: "mailto:ops@example.com",
      })
    ).toBeNull();
    expect(resolveVapidConfig({ ...VAPID_ENV, CHAT_VAPID_PRIVATE_KEY: "  " })).toBeNull();
  });

  it("returns the three values when all are configured", () => {
    expect(resolveVapidConfig(VAPID_ENV)).toEqual({
      publicKey: "public-key-value",
      privateKey: "private-key-value",
      subject: "mailto:ops@example.com",
    });
  });
});

/* ── subscription DAL (parameterized SQL, key material stays server-side) ── */

type PoolCall = { sql: string; params: readonly unknown[] };

function createMockPool() {
  const calls: PoolCall[] = [];
  let affectedRows = 1;
  let rows: unknown[] = [];
  const pool = {
    execute: vi.fn(async (sql: string, params: readonly unknown[]) => {
      calls.push({ sql, params });
      return [{ affectedRows }, { fieldCount: 0 }];
    }),
    query: vi.fn(async (sql: string, params: readonly unknown[]) => {
      calls.push({ sql, params });
      return [rows, { fieldCount: 0 }];
    }),
  };
  return {
    pool: pool as never,
    calls,
    setAffectedRows: (value: number) => {
      affectedRows = value;
    },
    setRows: (value: unknown[]) => {
      rows = value;
    },
  };
}

describe("createPushSubscriptionStore", () => {
  it("upserts a subscription with bound parameters and endpoint uniqueness", async () => {
    const { pool, calls } = createMockPool();
    const store = createPushSubscriptionStore(pool);

    await store.upsert({
      id: "sub-1",
      operatorId: "coordinator@example.com",
      endpoint: "https://push.example.net/endpoint-1",
      p256dh: "p256dh-value",
      auth: "auth-value",
      now: NOW,
    });

    expect(calls).toHaveLength(1);
    const [{ sql, params }] = calls;
    expect(sql).toContain("INSERT INTO operator_push_subscriptions");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(sql).toContain("endpoint = VALUES(endpoint)");
    expect(params).toEqual([
      "sub-1",
      "coordinator@example.com",
      "https://push.example.net/endpoint-1",
      "p256dh-value",
      "auth-value",
      NOW,
      NOW,
    ]);
    expect(sql).not.toContain("p256dh-value");
  });

  it("scopes deletion to the owning operator and reports the outcome", async () => {
    const { pool, calls, setAffectedRows } = createMockPool();
    const store = createPushSubscriptionStore(pool);

    setAffectedRows(1);
    expect(
      await store.deleteByOperatorEndpoint({
        operatorId: "coordinator@example.com",
        endpoint: "https://push.example.net/endpoint-1",
      })
    ).toBe(true);

    setAffectedRows(0);
    expect(
      await store.deleteByOperatorEndpoint({
        operatorId: "other@example.com",
        endpoint: "https://push.example.net/endpoint-1",
      })
    ).toBe(false);

    expect(calls[0].sql).toContain("DELETE FROM operator_push_subscriptions");
    expect(calls[0].sql).toContain("operator_id = ?");
    expect(calls[0].params).toEqual(["coordinator@example.com", "https://push.example.net/endpoint-1"]);
    expect(calls[1].params).toEqual(["other@example.com", "https://push.example.net/endpoint-1"]);
  });

  it("deletes a gone endpoint for push-service cleanup", async () => {
    const { pool, calls, setAffectedRows } = createMockPool();
    const store = createPushSubscriptionStore(pool);

    setAffectedRows(1);
    expect(await store.deleteByEndpoint("https://push.example.net/gone")).toBe(true);
    setAffectedRows(0);
    expect(await store.deleteByEndpoint("https://push.example.net/gone")).toBe(false);

    expect(calls[0].sql).toBe(
      "DELETE FROM operator_push_subscriptions WHERE endpoint = ?"
    );
    expect(calls[0].params).toEqual(["https://push.example.net/gone"]);
  });

  it("lists an operator's subscriptions with bound parameters", async () => {
    const { pool, calls, setRows } = createMockPool();
    const store = createPushSubscriptionStore(pool);

    setRows([
      {
        id: "sub-1",
        operator_id: "coordinator@example.com",
        endpoint: "https://push.example.net/endpoint-1",
        p256dh: "p256dh-value",
        auth: "auth-value",
        created_at: NOW,
        updated_at: NOW,
      },
    ]);

    const rows = await store.listByOperator("coordinator@example.com");
    expect(rows).toEqual([
      {
        id: "sub-1",
        operatorId: "coordinator@example.com",
        endpoint: "https://push.example.net/endpoint-1",
        p256dh: "p256dh-value",
        auth: "auth-value",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    expect(calls[0].sql).toContain("FROM operator_push_subscriptions");
    expect(calls[0].sql).toContain("operator_id = ?");
    expect(calls[0].params).toEqual(["coordinator@example.com"]);
  });
});

/* ── fan-out with injectable transport ────────────────────────────── */

describe("sendOperatorPushes", () => {
  function transportStub(
    handler: (target: { endpoint: string }, payload: string) => PushSendOutcome | Promise<PushSendOutcome>
  ): PushTransport & { calls: Array<{ endpoint: string; payload: string }> } {
    const calls: Array<{ endpoint: string; payload: string }> = [];
    return {
      calls,
      async send(target, payload) {
        calls.push({ endpoint: target.endpoint, payload });
        return handler(target, payload);
      },
    };
  }

  it("sends the same aggregate payload to every subscription", async () => {
    const transport = transportStub(() => ({ ok: true }));
    const report = await sendOperatorPushes({
      subscriptions: [
        subscription({ id: "sub-1", endpoint: "https://push.example.net/one" }),
        subscription({ id: "sub-2", endpoint: "https://push.example.net/two" }),
      ],
      unreadCount: 2,
      transport,
    });

    expect(report).toEqual({ attempted: 2, delivered: 2, failed: 0, removed: 0 });
    expect(transport.calls.map((call) => call.payload)).toEqual([
      '{"unreadCount":2}',
      '{"unreadCount":2}',
    ]);
  });

  it("removes a subscription only after a verified gone response", async () => {
    const transport = transportStub((target) =>
      target.endpoint.endsWith("gone")
        ? { ok: false, gone: true }
        : { ok: true }
    );
    const removeGone = vi.fn().mockResolvedValue(undefined);

    const report = await sendOperatorPushes({
      subscriptions: [
        subscription({ id: "sub-1", endpoint: "https://push.example.net/gone" }),
        subscription({ id: "sub-2", endpoint: "https://push.example.net/alive" }),
      ],
      unreadCount: 1,
      transport,
      removeGone,
    });

    expect(removeGone).toHaveBeenCalledTimes(1);
    expect(removeGone).toHaveBeenCalledWith("https://push.example.net/gone");
    expect(report).toEqual({ attempted: 2, delivered: 1, failed: 1, removed: 1 });
  });

  it("isolates a failing subscription from the rest of the fan-out", async () => {
    const transport = transportStub(async (target) => {
      if (target.endpoint.endsWith("broken")) throw new Error("network down");
      return { ok: true };
    });

    const report = await sendOperatorPushes({
      subscriptions: [
        subscription({ id: "sub-1", endpoint: "https://push.example.net/broken" }),
        subscription({ id: "sub-2", endpoint: "https://push.example.net/ok" }),
      ],
      unreadCount: 4,
      transport,
    });

    expect(report).toEqual({ attempted: 2, delivered: 1, failed: 1, removed: 0 });
  });

  it("resolves without pushing anything when the subscription list is empty", async () => {
    const transport = transportStub(() => ({ ok: true }));
    const report = await sendOperatorPushes({
      subscriptions: [],
      unreadCount: 1,
      transport,
    });
    expect(report).toEqual({ attempted: 0, delivered: 0, failed: 0, removed: 0 });
    expect(transport.calls).toHaveLength(0);
  });

  it("never carries endpoint or key material in the report", async () => {
    const transport = transportStub(() => ({ ok: false, gone: true }));
    const removeGone = vi.fn().mockResolvedValue(undefined);
    const report = await sendOperatorPushes({
      subscriptions: [
        subscription({
          endpoint: "https://push.example.net/secret-endpoint",
          p256dh: "secret-p256dh",
          auth: "secret-auth",
        }),
      ],
      unreadCount: 1,
      transport,
      removeGone,
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("secret-endpoint");
    expect(serialized).not.toContain("p256dh");
    expect(serialized).not.toContain("secret-auth");
  });
});

/* ── RFC 8291 aes128gcm payload encryption ────────────────────────── */

// RFC 8291 Appendix A "Intermediate Values for Encryption" ( Thomson,
// Standards Track). Plaintext: "When I grow up, I want to be a watermelon".
const RFC8291 = {
  plaintext: "When I grow up, I want to be a watermelon",
  uaPublic:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  authSecret: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic:
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  expected:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

describe("encryptWebPushPayload", () => {
  it("reproduces the RFC 8291 Appendix A ciphertext byte for byte", () => {
    const body = encryptWebPushPayload({
      plaintext: RFC8291.plaintext,
      p256dh: RFC8291.uaPublic,
      authSecret: RFC8291.authSecret,
      salt: RFC8291.salt,
      senderPrivateKey: RFC8291.asPrivate,
      senderPublicKey: RFC8291.asPublic,
    });
    expect(body).toBe(RFC8291.expected);
  });

  it("randomises the salt and ephemeral key when none are injected", () => {
    const a = encryptWebPushPayload({
      plaintext: RFC8291.plaintext,
      p256dh: RFC8291.uaPublic,
      authSecret: RFC8291.authSecret,
    });
    const b = encryptWebPushPayload({
      plaintext: RFC8291.plaintext,
      p256dh: RFC8291.uaPublic,
      authSecret: RFC8291.authSecret,
    });
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(86);
    expect(b.length).toBeGreaterThan(86);
  });

  it("rejects malformed key material instead of producing a broken payload", () => {
    expect(() =>
      encryptWebPushPayload({
        plaintext: "x",
        p256dh: "not-base64url!!",
        authSecret: RFC8291.authSecret,
      })
    ).toThrow();
  });
});

/* ── VAPID JWT (ES256) ────────────────────────────────────────────── */

describe("buildVapidJwt", () => {
  const audience = "https://push.example.net";
  const vapid: VapidConfig = {
    publicKey: "unused-public",
    privateKey: RFC8291.asPrivate,
    subject: "mailto:ops@example.com",
  };

  it("produces a three-part ES256 JWT whose payload matches the VAPID claims", () => {
    const token = buildVapidJwt({
      privateKey: vapid.privateKey,
      subject: vapid.subject,
      audience,
      now: NOW,
    });

    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    expect(header).toEqual({ typ: "JWT", alg: "ES256" });
    expect(payload.aud).toBe(audience);
    expect(payload.sub).toBe("mailto:ops@example.com");
    expect(payload.exp).toBe(Math.floor(NOW.getTime() / 1000) + 12 * 3600);
  });

  it("signs the claims so the derived VAPID public key verifies them", () => {
    const token = buildVapidJwt({
      privateKey: vapid.privateKey,
      subject: vapid.subject,
      audience,
      now: NOW,
    });
    const [header, payload, signature] = token.split(".");

    // The VAPID public key is derived from the same P-256 private key and
    // wrapped in a standard SPKI DER document for `verify`.
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(RFC8291.asPrivate, "base64url"));
    const spki = Buffer.concat([
      Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200", "hex"),
      ecdh.getPublicKey(),
    ]);
    const publicKeyPem =
      "-----BEGIN PUBLIC KEY-----\n" +
      spki.toString("base64") +
      "\n-----END PUBLIC KEY-----";

    const verified = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: publicKeyPem, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url")
    );
    expect(verified).toBe(true);
  });
});

/* ── default HTTP transport ───────────────────────────────────────── */

function jsonResponse(status: number): Response {
  return new Response(null, { status });
}

describe("createWebPushTransport", () => {
  const vapid: VapidConfig = {
    publicKey: "BM-test-public-key",
    privateKey: RFC8291.asPrivate,
    subject: "mailto:ops@example.com",
  };

  const target = {
    endpoint: "https://push.example.net/push/JzLQ3raZJfFBR0aqvOMsLrt54w4rJUsV",
    p256dh: RFC8291.uaPublic,
    auth: RFC8291.authSecret,
  };

  function fetchStub(result: Response | Error) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (result instanceof Error) throw result;
      return result;
    });
    return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
  }

  it("posts an aes128gcm-encrypted body with VAPID authorization", async () => {
    const { fetchImpl, calls } = fetchStub(jsonResponse(201));
    const transport = createWebPushTransport({ vapid, fetchImpl, ttlSeconds: 120 });

    const outcome = await transport.send(target, '{"unreadCount":1}');

    expect(outcome).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(target.endpoint);
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("content-encoding")).toBe("aes128gcm");
    expect(headers.get("content-type")).toBe("application/octet-stream");
    expect(headers.get("ttl")).toBe("120");
    const authorization = headers.get("authorization") ?? "";
    expect(authorization.startsWith("vapid ")).toBe(true);
    expect(authorization).toContain("k=BM-test-public-key");
    expect(authorization).toContain("t=");
    const body = calls[0].init.body as Buffer;
    expect(Buffer.byteLength(body)).toBeGreaterThan(86);
  });

  it("maps 404/410 to a gone outcome and other failures to a retryable failure", async () => {
    for (const status of [404, 410]) {
      const { fetchImpl } = fetchStub(jsonResponse(status));
      const transport = createWebPushTransport({ vapid, fetchImpl });
      expect(await transport.send(target, "{}")).toEqual({ ok: false, gone: true });
    }
    for (const status of [400, 401, 413, 429, 500, 503]) {
      const { fetchImpl } = fetchStub(jsonResponse(status));
      const transport = createWebPushTransport({ vapid, fetchImpl });
      expect(await transport.send(target, "{}")).toEqual({ ok: false, gone: false });
    }
  });

  it("never treats a network error as gone (subscription stays for retry)", async () => {
    const { fetchImpl } = fetchStub(new Error("ECONNRESET"));
    const transport = createWebPushTransport({ vapid, fetchImpl });
    expect(await transport.send(target, "{}")).toEqual({ ok: false, gone: false });
  });
});
