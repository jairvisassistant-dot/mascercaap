import "server-only";

import { NextResponse } from "next/server";

import {
  chatErrorResponse,
  type ChatResponse,
} from "./types";
import {
  CHAT_VISITOR_SESSION_COOKIE_NAME,
  resolveVisitorSession,
  type ResolvedVisitorSession,
  type VisitorSessionSigningKeys,
  type VisitorSessionStore,
} from "./visitor-session";

/**
 * Server-only transport helpers shared by every visitor chat route.
 *
 * These helpers centralize the non-negotiable response and input rules so no
 * route can drift:
 * - a strict, configured origin allowlist with **no silent production
 *   fallback** (an empty `ALLOWED_ORIGINS` rejects every origin, including the
 *   real site origin); an explicitly presented `Origin` is exact-matched for
 *   both state-changing and safe requests, while an *absent* `Origin` is
 *   rejected by default and only tolerated for authenticated safe reads
 *   (`allowAbsentOrigin`), where browsers omit it on same-origin `GET`;
 * - `Cache-Control: no-store` and a JSON content type on every response;
 * - one generic, non-enumerating error envelope for every failure;
 * - a bounded JSON reader that rejects wrong media types and over-sized bodies
 *   before any parsing;
 * - cookie parsing and trusted request-key extraction without depending on
 *   `NextRequest`, so routes stay unit-testable with a plain `Request`;
 * - bounded logging that only ever emits a fixed event code (never a body, id,
 *   token, origin or any request-derived value).
 */

/** Status for a request that arrives while the whole module is disabled. */
export const CHAT_DISABLED_STATUS = 404;

/** Maximum accepted JSON request body (bytes); far above the 1000-char body bound. */
export const CHAT_MAX_JSON_BODY_BYTES = 8192;

/** Longest accepted trusted request key before hashing. */
export const CHAT_TRUSTED_KEY_MAX_LENGTH = 128;

const NO_STORE = "no-store";

/* ── Origin allowlist ─────────────────────────────────────────────── */

/** Splits `ALLOWED_ORIGINS` into an exact, ordered, de-duplicated allowlist. */
export function parseAllowedOrigins(raw: string | undefined): readonly string[] {
  if (raw === undefined) return Object.freeze([]);
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const part of raw.split(",")) {
    const origin = part.trim();
    if (origin === "" || seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
  }
  return Object.freeze(origins);
}

/** Reads the configured allowlist from an environment map. */
export function resolveAllowedOrigins(env: {
  readonly [key: string]: string | undefined;
}): readonly string[] {
  return parseAllowedOrigins(env.ALLOWED_ORIGINS);
}

/**
 * Exact-match origin check. An empty allowlist rejects everything, and a missing
 * origin is rejected: there is deliberately no hardcoded production fallback.
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowed: readonly string[]
): boolean {
  if (allowed.length === 0) return false;
  if (typeof origin !== "string") return false;
  const value = origin.trim();
  if (value === "") return false;
  return allowed.includes(value);
}

/**
 * Returns the generic 403 response when the request origin is not allowlisted,
 * or `null` when the request may proceed. With the default (strict) options an
 * absent `Origin` is rejected; pass `{ allowAbsentOrigin: true }` only for an
 * authenticated safe read.
 */
export function assertChatRequestOrigin(
  request: Request,
  env: { readonly [key: string]: string | undefined },
  options: ChatOriginCheckOptions = {}
): NextResponse | null {
  const allowed = resolveAllowedOrigins(env);
  const origin = request.headers.get("origin");
  if (isOriginAllowed(origin, allowed)) return null;
  if (options.allowAbsentOrigin === true && !hasExplicitOrigin(origin)) return null;
  return chatErrorResponseJson(403);
}

/**
 * True when the request carries an explicit, non-blank `Origin` header. Used to
 * tell a deliberate cross-origin claim apart from a browser omitting `Origin`
 * on a same-origin request.
 */
export function hasExplicitOrigin(origin: string | null | undefined): boolean {
  return typeof origin === "string" && origin.trim() !== "";
}

/**
 * Origin-check tuning. The default is strict: an absent `Origin` is rejected,
 * which keeps state-changing requests protected against CSRF. `allowAbsentOrigin`
 * opts an authenticated, safe (non-state-changing) read into tolerating a
 * missing `Origin`, because browsers omit it on same-origin `GET`. An
 * explicitly presented `Origin` is always exact-matched against the allowlist,
 * so a cross-origin read is rejected exactly as with the strict policy.
 */
export type ChatOriginCheckOptions = {
  readonly allowAbsentOrigin?: boolean;
};

/* ── Response builders ────────────────────────────────────────────── */

/** Success/typed chat response with `Cache-Control: no-store`. */
export function chatJsonResponse<T>(body: ChatResponse<T>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": NO_STORE },
  });
}

/** Generic error envelope for a given HTTP status; contains no detail. */
export function chatErrorResponseJson(status: number): NextResponse {
  return NextResponse.json(chatErrorResponse(), {
    status,
    headers: { "Cache-Control": NO_STORE },
  });
}

/** Generic disabled response returned while `CHAT_ENABLED` is off. */
export function chatDisabledResponse(): NextResponse {
  return chatErrorResponseJson(CHAT_DISABLED_STATUS);
}

export function chatOriginRejectionResponse(): NextResponse {
  return chatErrorResponseJson(403);
}

export function chatUnauthorizedResponse(): NextResponse {
  return chatErrorResponseJson(401);
}

export function chatNotFoundResponse(): NextResponse {
  return chatErrorResponseJson(404);
}

export function chatInvalidRequestResponse(): NextResponse {
  return chatErrorResponseJson(400);
}

export function chatUnsupportedMediaResponse(): NextResponse {
  return chatErrorResponseJson(415);
}

export function chatPayloadTooLargeResponse(): NextResponse {
  return chatErrorResponseJson(413);
}

export function chatUnavailableResponse(): NextResponse {
  return chatErrorResponseJson(503);
}

/** 429 with a bounded, positive integer `Retry-After`. */
export function chatRateLimitedResponse(retryAfterSeconds: number): NextResponse {
  const seconds =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.ceil(retryAfterSeconds)
      : 1;
  return NextResponse.json(chatErrorResponse(), {
    status: 429,
    headers: { "Cache-Control": NO_STORE, "Retry-After": String(seconds) },
  });
}

/** Maps a bounded-body failure reason to its generic, non-enumerating response. */
export function chatBoundedBodyErrorResponse(reason: BoundedBodyErrorReason): NextResponse {
  if (reason === "unsupported_media_type") return chatUnsupportedMediaResponse();
  if (reason === "too_large") return chatPayloadTooLargeResponse();
  return chatInvalidRequestResponse();
}

/* ── Bounded JSON reader ──────────────────────────────────────────── */

export type BoundedBodyErrorReason = "unsupported_media_type" | "too_large" | "invalid";

export type BoundedJsonResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly reason: BoundedBodyErrorReason };

async function readBoundedText(
  request: Request,
  maxBytes: number
): Promise<string | null> {
  const body = request.body;
  if (body === null) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  text += decoder.decode();
  return text;
}

/**
 * Reads and parses a JSON body with a hard byte cap. Rejects a non-JSON content
 * type, an over-sized declared or streamed body, and invalid JSON — all before
 * the value reaches any schema.
 */
export async function readBoundedJsonBody(
  request: Request,
  maxBytes: number = CHAT_MAX_JSON_BODY_BYTES
): Promise<BoundedJsonResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, reason: "unsupported_media_type" };
  }

  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  let text: string | null;
  try {
    text = await readBoundedText(request, maxBytes);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (text === null) return { ok: false, reason: "too_large" };
  if (text.trim() === "") return { ok: false, reason: "invalid" };

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/* ── Request metadata ─────────────────────────────────────────────── */

/** Reads a single cookie value from the `Cookie` header, without `NextRequest`. */
export function readRequestCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (header === null) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    return value === "" ? null : value;
  }
  return null;
}

/**
 * Derives the trusted client key used for rate limiting: the first forwarded
 * address, then `x-real-ip`, then `"anonymous"`. Bounded so a hostile header
 * cannot grow the hash input without limit.
 */
export function resolveTrustedRequestKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate =
    (forwarded && forwarded !== "" ? forwarded : undefined) ??
    request.headers.get("x-real-ip")?.trim() ??
    "";
  if (candidate === "") return "anonymous";
  return candidate.slice(0, CHAT_TRUSTED_KEY_MAX_LENGTH);
}

/**
 * Resolves the visitor session scope from the signed cookie. Returns `null` for
 * an absent or unusable cookie; delegating secret verification and fail-closed
 * store behavior to {@link resolveVisitorSession}.
 */
export async function resolveRequestVisitorSession(input: {
  readonly request: Request;
  readonly signingKeys: VisitorSessionSigningKeys;
  readonly store: VisitorSessionStore;
}): Promise<ResolvedVisitorSession | null> {
  const cookieValue = readRequestCookie(input.request, CHAT_VISITOR_SESSION_COOKIE_NAME);
  if (cookieValue === null) return null;
  return resolveVisitorSession({
    cookieValue,
    signingKeys: input.signingKeys,
    store: input.store,
  });
}

/* ── Bounded logging ──────────────────────────────────────────────── */

/**
 * Logs a fixed event code only. Callers must pass a literal, never a value
 * derived from the request, so bodies, ids, tokens and PII can never be logged.
 */
export function logChatServerEvent(event: string): void {
  if (typeof event !== "string" || event === "") return;
  console.error(JSON.stringify({ scope: "chat", event }));
}
