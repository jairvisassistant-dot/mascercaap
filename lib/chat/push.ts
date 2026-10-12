import "server-only";

import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  randomUUID,
  sign,
  type KeyObject,
} from "node:crypto";

import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

/**
 * Server-only Web Push support for the coordinator inbox.
 *
 * Hard invariants (Criterios-Chat.md sections 6, 8 and 9):
 * - **Aggregate-only payload.** A push payload is exactly
 *   `{"unreadCount":<n>}` — never a conversation id, visitor name, phone,
 *   message body or any other field. {@link buildOperatorPushPayload} is the
 *   single payload builder.
 * - **Fixed title and body.** The visible notification text is constant
 *   Spanish copy with no dynamic personal content.
 * - **Key material never leaves the server.** `endpoint`, `p256dh` and `auth`
 *   are stored, routed to the transport, and deleted on a verified gone
 *   response — they are never returned in an API response, log, SSE event or
 *   push payload.
 * - **Verified removal only.** A subscription is deleted only after the push
 *   service answers 404/410; network errors and 5xx responses leave it intact
 *   for a later retry.
 * - **Failure isolation.** One broken subscription never interrupts the
 *   fan-out to the others, and the fan-out never throws.
 * - **No dependencies.** VAPID JWT (ES256) and `aes128gcm` payload encryption
 *   (RFC 8291) are implemented with `node:crypto` only; the encryption is
 *   verified against the RFC 8291 Appendix A test vector.
 */

/** Fixed notification title (Spanish, no dynamic content). */
export const CHAT_PUSH_NOTIFICATION_TITLE = "Mas Cerca AP — chat en vivo";

/** Fixed notification body (Spanish, no dynamic content). */
export const CHAT_PUSH_NOTIFICATION_BODY =
  "Tienes mensajes nuevos en la bandeja de chat.";

/** Aggregate count bounds: never negative, never unbounded in the payload. */
export const CHAT_PUSH_MAX_UNREAD_COUNT = 999;

/** Push message lifetime advertised to the push service (RFC 8030 `TTL`). */
export const CHAT_PUSH_TTL_SECONDS = 120;

/** VAPID JWT lifetime: 12 hours, well inside the common 24-hour service cap. */
export const CHAT_VAPID_JWT_TTL_SECONDS = 43_200;

/* ── Payload ──────────────────────────────────────────────────────── */

/** Clamps any input into a bounded, non-negative integer unread count. */
export function normalizeChatUnreadCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const rounded = Math.round(parsed);
  if (rounded < 0) return 0;
  return Math.min(rounded, CHAT_PUSH_MAX_UNREAD_COUNT);
}

/**
 * The single push payload: exactly `{ unreadCount }`. Any caller-supplied
 * conversation data simply has no place in this shape.
 */
export function buildOperatorPushPayload(unreadCount: number): string {
  return JSON.stringify({ unreadCount: normalizeChatUnreadCount(unreadCount) });
}

/* ── VAPID configuration ──────────────────────────────────────────── */

export type VapidConfig = {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
};

/**
 * Reads the three VAPID variables from an environment map. Returns `null`
 * unless all three are present, so an unconfigured deployment fails closed and
 * never sends an unauthenticated push.
 */
export function resolveVapidConfig(env: {
  readonly [key: string]: string | undefined;
}): VapidConfig | null {
  const publicKey = env.CHAT_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.CHAT_VAPID_PRIVATE_KEY?.trim();
  const subject = env.CHAT_VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return Object.freeze({ publicKey, privateKey, subject });
}

/* ── Subscription DAL ─────────────────────────────────────────────── */

/** Persisted subscription fields. `p256dh`/`auth` are server-side only. */
export type PushSubscriptionRecord = {
  readonly id: string;
  readonly operatorId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type NewPushSubscriptionInput = {
  readonly id: string;
  readonly operatorId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly now: Date;
};

/** Port implemented by {@link createPushSubscriptionStore}; mockable in tests. */
export interface PushSubscriptionStore {
  /** Idempotent save keyed by the unique endpoint; refreshes the key material. */
  upsert(input: NewPushSubscriptionInput): Promise<void>;
  /** Removes an endpoint owned by the operator; reports whether it existed. */
  deleteByOperatorEndpoint(input: {
    readonly operatorId: string;
    readonly endpoint: string;
  }): Promise<boolean>;
  /** Removes an endpoint the push service reported gone. */
  deleteByEndpoint(endpoint: string): Promise<boolean>;
  /** Server-only read used by the sender; the result never reaches a client. */
  listByOperator(operatorId: string): Promise<PushSubscriptionRecord[]>;
}

const UPSERT_SUBSCRIPTION_SQL =
  "INSERT INTO operator_push_subscriptions " +
  "(id, operator_id, endpoint, p256dh, auth, created_at, updated_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?) " +
  "ON DUPLICATE KEY UPDATE endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), " +
  "auth = VALUES(auth), updated_at = VALUES(updated_at)";

const DELETE_BY_OPERATOR_ENDPOINT_SQL =
  "DELETE FROM operator_push_subscriptions WHERE operator_id = ? AND endpoint = ?";

const DELETE_BY_ENDPOINT_SQL =
  "DELETE FROM operator_push_subscriptions WHERE endpoint = ?";

const LIST_BY_OPERATOR_SQL =
  "SELECT id, operator_id, endpoint, p256dh, auth, created_at, updated_at " +
  "FROM operator_push_subscriptions WHERE operator_id = ?";

type SubscriptionRow = RowDataPacket & {
  id: string;
  operator_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Date;
  updated_at: Date;
};

function mapSubscriptionRow(row: SubscriptionRow): PushSubscriptionRecord {
  return {
    id: String(row.id),
    operatorId: String(row.operator_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** Adapts a mysql2 pool to the {@link PushSubscriptionStore} port. */
export function createPushSubscriptionStore(pool: Pool): PushSubscriptionStore {
  return {
    async upsert(input) {
      await pool.execute(UPSERT_SUBSCRIPTION_SQL, [
        input.id,
        input.operatorId,
        input.endpoint,
        input.p256dh,
        input.auth,
        input.now,
        input.now,
      ]);
    },

    async deleteByOperatorEndpoint(input) {
      const [result] = await pool.execute<ResultSetHeader>(DELETE_BY_OPERATOR_ENDPOINT_SQL, [
        input.operatorId,
        input.endpoint,
      ]);
      return Number(result.affectedRows ?? 0) > 0;
    },

    async deleteByEndpoint(endpoint) {
      const [result] = await pool.execute<ResultSetHeader>(DELETE_BY_ENDPOINT_SQL, [
        endpoint,
      ]);
      return Number(result.affectedRows ?? 0) > 0;
    },

    async listByOperator(operatorId) {
      const [rows] = await pool.query<SubscriptionRow[]>(LIST_BY_OPERATOR_SQL, [
        operatorId,
      ]);
      return rows.map(mapSubscriptionRow);
    },
  };
}

/** Generates the server-side id for a new subscription row. */
export function newPushSubscriptionId(): string {
  return randomUUID();
}

/* ── Fan-out ──────────────────────────────────────────────────────── */

/** Minimal server-side view handed to a transport (endpoint + key material). */
export type PushTransportTarget = {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
};

/**
 * Builds the target handed to a transport. The key material is attached as
 * non-enumerable properties: the transport reads it to encrypt, but
 * `JSON.stringify`, `util.inspect` and most log formatters never serialize it
 * — key material cannot leak through a careless log or error message.
 */
export function createPushTransportTarget(subscription: {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}): PushTransportTarget {
  const target = { endpoint: subscription.endpoint } as PushTransportTarget;
  Object.defineProperties(target, {
    p256dh: { value: subscription.p256dh, enumerable: false },
    auth: { value: subscription.auth, enumerable: false },
  });
  return target;
}

export type PushSendOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly gone: boolean };

export interface PushTransport {
  send(target: PushTransportTarget, payload: string): Promise<PushSendOutcome>;
}

/** PII-free fan-out report: counts only, never an identifier. */
export type OperatorPushReport = {
  readonly attempted: number;
  readonly delivered: number;
  readonly failed: number;
  readonly removed: number;
};

/**
 * Fans one aggregate payload out to every subscription. Each delivery is
 * isolated: a throw is counted as a failure and the loop continues. A `gone`
 * outcome triggers `removeGone` — and only a verified gone response ever
 * removes a subscription.
 */
export async function sendOperatorPushes(input: {
  readonly subscriptions: readonly PushSubscriptionRecord[];
  readonly unreadCount: number;
  readonly transport: PushTransport;
  readonly removeGone?: (endpoint: string) => Promise<unknown> | unknown;
}): Promise<OperatorPushReport> {
  const payload = buildOperatorPushPayload(input.unreadCount);
  let delivered = 0;
  let failed = 0;
  let removed = 0;

  for (const subscription of input.subscriptions) {
    try {
      const outcome = await input.transport.send(
        createPushTransportTarget({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        }),
        payload
      );
      if (outcome.ok) {
        delivered += 1;
        continue;
      }
      failed += 1;
      if (outcome.gone && input.removeGone !== undefined) {
        try {
          await input.removeGone(subscription.endpoint);
          removed += 1;
        } catch {
          // Removal is best-effort cleanup; a failure retries on the next gone.
        }
      }
    } catch {
      failed += 1;
    }
  }

  return Object.freeze({
    attempted: input.subscriptions.length,
    delivered,
    failed,
    removed,
  });
}

/* ── aes128gcm payload encryption (RFC 8291) ──────────────────────── */

const RECORD_SIZE = 4096;
const SALT_BYTES = 16;
const AUTH_SECRET_BYTES = 16;
const UA_PUBLIC_BYTES = 65;

function decodeBase64UrlStrict(value: string, expectedBytes?: number): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("invalid base64url value");
  }
  const decoded = Buffer.from(value, "base64url");
  if (expectedBytes !== undefined && decoded.length !== expectedBytes) {
    throw new Error("unexpected key length");
  }
  return decoded;
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/**
 * Encrypts one push payload with the `aes128gcm` content coding of RFC 8291
 * and returns the base64url body. The salt and the ephemeral application-server
 * key pair are random by default; tests inject the RFC 8291 Appendix A values
 * to verify byte-for-byte agreement with the standard.
 */
export function encryptWebPushPayload(input: {
  readonly plaintext: string;
  readonly p256dh: string;
  readonly authSecret: string;
  readonly salt?: string;
  readonly senderPrivateKey?: string;
  readonly senderPublicKey?: string;
}): string {
  const uaPublic = decodeBase64UrlStrict(input.p256dh, UA_PUBLIC_BYTES);
  const authSecret = decodeBase64UrlStrict(input.authSecret, AUTH_SECRET_BYTES);
  const salt =
    input.salt === undefined
      ? randomBytes(SALT_BYTES)
      : decodeBase64UrlStrict(input.salt, SALT_BYTES);

  const ecdh = createECDH("prime256v1");
  if (input.senderPrivateKey !== undefined) {
    ecdh.setPrivateKey(decodeBase64UrlStrict(input.senderPrivateKey, 32));
  } else {
    ecdh.generateKeys();
  }
  const asPublic =
    input.senderPublicKey === undefined
      ? ecdh.getPublicKey()
      : decodeBase64UrlStrict(input.senderPublicKey, UA_PUBLIC_BYTES);

  // RFC 8291 §3.3–3.4: combine the ECDH secret with the auth secret, then
  // derive the content encryption key and nonce per RFC 8188.
  const ecdhSecret = ecdh.computeSecret(uaPublic);
  const prkKey = hmacSha256(authSecret, ecdhSecret);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info", "utf8"),
    Buffer.from([0]),
    uaPublic,
    asPublic,
  ]);
  const ikm = hmacSha256(prkKey, Buffer.concat([keyInfo, Buffer.from([1])]));
  const prk = hmacSha256(salt, ikm);
  const cekInfo = Buffer.concat([
    Buffer.from("Content-Encoding: aes128gcm", "utf8"),
    Buffer.from([0]),
  ]);
  const nonceInfo = Buffer.concat([
    Buffer.from("Content-Encoding: nonce", "utf8"),
    Buffer.from([0]),
  ]);
  const cek = hmacSha256(prk, Buffer.concat([cekInfo, Buffer.from([1])])).subarray(0, 16);
  const nonce = hmacSha256(prk, Buffer.concat([nonceInfo, Buffer.from([1])])).subarray(0, 12);

  // Header: salt(16) | rs(4, big-endian) | keyid length(65) | as_public(65).
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(RECORD_SIZE, 0);
  const header = Buffer.concat([
    salt,
    recordSize,
    Buffer.from([UA_PUBLIC_BYTES]),
    asPublic,
  ]);

  // Single record: plaintext plus the 0x02 padding delimiter (RFC 8291 §4).
  const padded = Buffer.concat([Buffer.from(input.plaintext, "utf8"), Buffer.from([2])]);

  // RFC 8188 aes128gcm records carry no AAD: the salt and keyid are bound
  // through the HKDF inputs above, so the GCM tag authenticates only the
  // ciphertext itself (verified against the RFC 8291 Appendix A vector).
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  return Buffer.concat([header, ciphertext]).toString("base64url");
}

/* ── VAPID JWT (ES256) ────────────────────────────────────────────── */

/**
 * Converts a raw base64url P-256 private key (the standard VAPID key format)
 * into a `KeyObject` by wrapping it in a SEC1 `ECPrivateKey` DER document
 * with the `prime256v1` curve parameters.
 */
function vapidPrivateKeyToObject(raw: string): KeyObject {
  const d = decodeBase64UrlStrict(raw, 32);
  const body = Buffer.concat([
    Buffer.from("020101", "hex"), // version 1
    Buffer.concat([Buffer.from("0420", "hex"), d]), // OCTET STRING(32) private key
    Buffer.from("a00a06082a8648ce3d030107", "hex"), // curve OID 1.2.840.10045.3.1.7
  ]);
  const der = Buffer.concat([Buffer.from("30", "hex"), Buffer.from([body.length]), body]);
  return createPrivateKey({ key: der, format: "der", type: "sec1" });
}

/**
 * Builds the VAPID authorization JWT (RFC 8291 §6, ES256). The signature is
 * emitted in the raw `r || s` form JWTs require (`ieee-p1363`).
 */
export function buildVapidJwt(input: {
  readonly privateKey: string;
  readonly subject: string;
  readonly audience: string;
  readonly now: Date;
}): string {
  const header = Buffer.from(
    JSON.stringify({ typ: "JWT", alg: "ES256" }),
    "utf8"
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      aud: input.audience,
      exp: Math.floor(input.now.getTime() / 1000) + CHAT_VAPID_JWT_TTL_SECONDS,
      sub: input.subject,
    }),
    "utf8"
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(signingInput, "utf8"), {
    key: vapidPrivateKeyToObject(input.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${signature.toString("base64url")}`;
}

/* ── Default HTTP transport ───────────────────────────────────────── */

/** Maximum accepted `TTL` (RFC 8030 cap used by major push services). */
export const CHAT_PUSH_TTL_MAX_SECONDS = 2_419_200;

function clampTtl(value: number): number {
  if (!Number.isFinite(value) || value < 0) return CHAT_PUSH_TTL_SECONDS;
  return Math.min(Math.floor(value), CHAT_PUSH_TTL_MAX_SECONDS);
}

/**
 * The production transport: POSTs an `aes128gcm`-encrypted body to the push
 * endpoint with VAPID authorization. 404/410 map to `gone` (drop the
 * subscription); every other failure — including transport errors — is
 * retryable and never removes the subscription.
 */
export function createWebPushTransport(input: {
  readonly vapid: VapidConfig;
  readonly fetchImpl?: typeof fetch;
  readonly ttlSeconds?: number;
}): PushTransport {
  const fetchImpl = input.fetchImpl ?? fetch;
  const ttl = clampTtl(input.ttlSeconds ?? CHAT_PUSH_TTL_SECONDS);

  return {
    async send(target, payload) {
      try {
        const url = new URL(target.endpoint);
        if (url.protocol !== "https:") return { ok: false, gone: false };

        const body = encryptWebPushPayload({
          plaintext: payload,
          p256dh: target.p256dh,
          authSecret: target.auth,
        });
        const jwt = buildVapidJwt({
          privateKey: input.vapid.privateKey,
          subject: input.vapid.subject,
          audience: url.origin,
          now: new Date(),
        });

        const response = await fetchImpl(target.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: String(ttl),
            Authorization: `vapid t=${jwt}, k=${input.vapid.publicKey}`,
          },
          body: Buffer.from(body, "base64url"),
        });

        if (response.ok) return { ok: true };
        if (response.status === 404 || response.status === 410) {
          return { ok: false, gone: true };
        }
        return { ok: false, gone: false };
      } catch {
        return { ok: false, gone: false };
      }
    },
  };
}
