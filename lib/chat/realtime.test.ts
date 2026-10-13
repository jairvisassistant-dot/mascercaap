import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_OPERATOR_SIGNAL_SCOPE,
  CHAT_SSE_CHANGED_EVENT,
  CHAT_SSE_MAX_DURATION_MS,
  buildChatSseResponse,
  chatSseHeaders,
  createChatSignalHub,
  formatChatSseChanged,
  formatChatSseHeartbeat,
  formatChatSseRetry,
  getChatSignalHub,
  hashChatStreamKey,
  publishConversationChanged,
  resetChatSignalHub,
} from "./realtime";

/**
 * Unit tests for the server-only in-process SSE signal hub.
 *
 * They prove the hard invariants: opaque framing (no ids/content on the wire),
 * routing (conversation + coordinator fan-out), per-key/total caps, PII-free
 * metrics, and the full stream lifecycle (retry preamble, heartbeat, bounded
 * duration, abort/cancel cleanup).
 */

const decoder = new TextDecoder();

async function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<{ done: boolean; text: string }> {
  const { value, done } = await reader.read();
  return { done, text: value === undefined ? "" : decoder.decode(value) };
}

const KEYS = [{ key: hashChatStreamKey("session-1"), max: 3 }];

afterEach(() => {
  vi.useRealTimers();
  resetChatSignalHub();
});

describe("hashChatStreamKey", () => {
  it("returns a stable, opaque 64-hex digest with no plaintext", () => {
    const digest = hashChatStreamKey("ana@example.com");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashChatStreamKey("ana@example.com")).toBe(digest);
    expect(digest).not.toContain("ana");
  });
});

describe("SSE framing", () => {
  it("emits only an empty, opaque changed event", () => {
    const frame = formatChatSseChanged();
    expect(frame).toBe(`event: ${CHAT_SSE_CHANGED_EVENT}\ndata:\n\n`);
    // The only non-blank lines are the event name and an empty data field.
    const lines = frame.split("\n").filter((line) => line !== "");
    expect(lines).toEqual([`event: ${CHAT_SSE_CHANGED_EVENT}`, "data:"]);
  });

  it("uses comment-only heartbeats and a bounded retry hint", () => {
    expect(formatChatSseHeartbeat()).toBe(": heartbeat\n\n");
    expect(formatChatSseRetry(2500)).toBe("retry: 2500\n\n");
    expect(formatChatSseRetry(Number.NaN)).toBe("retry: 3000\n\n");
  });

  it("sets no-store/no-transform and proxy-buffering headers", () => {
    const headers = chatSseHeaders();
    expect(headers["Content-Type"]).toContain("text/event-stream");
    expect(headers["Cache-Control"]).toContain("no-store");
    expect(headers["Cache-Control"]).toContain("no-transform");
    expect(headers["X-Accel-Buffering"]).toBe("no");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});

describe("signal hub routing", () => {
  it("delivers to the matching conversation and never to another scope", () => {
    const hub = createChatSignalHub();
    const a = hub.subscribe({ scope: "conversation-a", keys: [{ key: "ka", max: 3 }] });
    const b = hub.subscribe({ scope: "conversation-b", keys: [{ key: "kb", max: 3 }] });
    if (!a.ok || !b.ok) throw new Error("subscriptions should succeed");

    const onA = vi.fn();
    const onB = vi.fn();
    a.subscription.listen(onA);
    b.subscription.listen(onB);

    hub.publish("conversation-a");
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();
  });

  it("fans every conversation change out to the coordinator scope", () => {
    const hub = createChatSignalHub();
    const operator = hub.subscribe({
      scope: CHAT_OPERATOR_SIGNAL_SCOPE,
      keys: [{ key: "op", max: 3 }],
    });
    if (!operator.ok) throw new Error("subscription should succeed");
    const onOperator = vi.fn();
    operator.subscription.listen(onOperator);

    hub.publish("conversation-a");
    hub.publish("conversation-b");
    expect(onOperator).toHaveBeenCalledTimes(2);
    expect(hub.metrics().publishesTotal).toBe(2);
  });

  it("tracks PII-free connection metrics and closes idempotently", () => {
    const hub = createChatSignalHub();
    const result = hub.subscribe({ scope: "conversation-a", keys: KEYS });
    if (!result.ok) throw new Error("subscription should succeed");
    expect(hub.size()).toBe(1);
    expect(hub.metrics()).toMatchObject({ openConnections: 1, openedTotal: 1, closedTotal: 0 });

    result.subscription.close();
    result.subscription.close();
    expect(hub.size()).toBe(0);
    expect(hub.metrics()).toMatchObject({ openConnections: 0, closedTotal: 1 });
  });

  it("enforces per-key and total caps without leaking the key", () => {
    const hub = createChatSignalHub();
    const key = { key: hashChatStreamKey("shared"), max: 2 };
    expect(hub.subscribe({ scope: "a", keys: [key] }).ok).toBe(true);
    expect(hub.subscribe({ scope: "b", keys: [key] }).ok).toBe(true);
    const third = hub.subscribe({ scope: "c", keys: [key] });
    expect(third.ok).toBe(false);
    if (third.ok) throw new Error("expected rejection");
    expect(third.reason).toBe("connection_limit");
    expect(third.retryAfterSeconds).toBeGreaterThan(0);

    const capped = createChatSignalHub();
    expect(capped.subscribe({ scope: "x", keys: [{ key: "k", max: 5 }], maxTotal: 1 }).ok).toBe(
      true
    );
    expect(capped.subscribe({ scope: "y", keys: [{ key: "k2", max: 5 }], maxTotal: 1 }).ok).toBe(
      false
    );
    expect(capped.metrics().rejectedTotal).toBe(1);
  });
});

describe("buildChatSseResponse", () => {
  it("sends the retry preamble and forwards opaque changed events", async () => {
    const hub = createChatSignalHub();
    const scope = "conversation-secret-id";
    const result = hub.subscribe({ scope, keys: KEYS });
    if (!result.ok) throw new Error("subscription should succeed");

    const response = buildChatSseResponse(result.subscription);
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");

    const reader = response.body!.getReader();
    const preamble = await readChunk(reader);
    expect(preamble.text).toBe(formatChatSseRetry());

    hub.publish(scope);
    const changed = await readChunk(reader);
    expect(changed.text).toBe(formatChatSseChanged());
    // The opaque event must never carry the conversation id.
    expect(changed.text).not.toContain(scope);

    await reader.cancel();
    expect(hub.size()).toBe(0);
  });

  it("writes heartbeats on cadence and records PII-free metrics", async () => {
    vi.useFakeTimers();
    const hub = createChatSignalHub();
    const result = hub.subscribe({ scope: "conversation-a", keys: KEYS });
    if (!result.ok) throw new Error("subscription should succeed");

    const response = buildChatSseResponse(result.subscription, undefined, {
      heartbeatIntervalMs: 1_000,
      maxDurationMs: 60_000,
    });
    const reader = response.body!.getReader();
    await readChunk(reader); // retry preamble

    await vi.advanceTimersByTimeAsync(1_000);
    const heartbeat = await readChunk(reader);
    expect(heartbeat.text).toBe(formatChatSseHeartbeat());
    expect(hub.metrics().heartbeatsTotal).toBe(1);

    await reader.cancel();
  });

  it("closes after the bounded maximum duration", async () => {
    vi.useFakeTimers();
    const hub = createChatSignalHub();
    const result = hub.subscribe({ scope: "conversation-a", keys: KEYS });
    if (!result.ok) throw new Error("subscription should succeed");

    const response = buildChatSseResponse(result.subscription, undefined, {
      // Keep heartbeats out of the window so the expiry close is the next frame.
      heartbeatIntervalMs: CHAT_SSE_MAX_DURATION_MS + 60_000,
      maxDurationMs: CHAT_SSE_MAX_DURATION_MS,
    });
    const reader = response.body!.getReader();
    await readChunk(reader);

    await vi.advanceTimersByTimeAsync(CHAT_SSE_MAX_DURATION_MS);
    const end = await readChunk(reader);
    expect(end.done).toBe(true);
    expect(hub.metrics().expirationsTotal).toBe(1);
    expect(hub.size()).toBe(0);
  });

  it("releases the subscription and timers when the abort signal fires", async () => {
    vi.useFakeTimers();
    const hub = createChatSignalHub();
    const result = hub.subscribe({ scope: "conversation-a", keys: KEYS });
    if (!result.ok) throw new Error("subscription should succeed");

    const controller = new AbortController();
    const response = buildChatSseResponse(result.subscription, controller.signal, {
      heartbeatIntervalMs: 1_000,
      maxDurationMs: 60_000,
    });
    const reader = response.body!.getReader();
    await readChunk(reader);

    controller.abort();
    expect(hub.size()).toBe(0);
    expect(hub.metrics().closedTotal).toBe(1);

    const end = await readChunk(reader);
    expect(end.done).toBe(true);

    // A late heartbeat tick must not resurrect the closed stream.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(hub.metrics().heartbeatsTotal).toBe(0);
  });
});

describe("publishConversationChanged", () => {
  it("fans the wake-up through the process-wide hub after commit", () => {
    resetChatSignalHub();
    const hub = getChatSignalHub();
    const result = hub.subscribe({ scope: "conversation-a", keys: KEYS });
    if (!result.ok) throw new Error("subscription should succeed");
    const onSignal = vi.fn();
    result.subscription.listen(onSignal);

    publishConversationChanged("conversation-a");

    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(hub.metrics().publishesTotal).toBe(1);
  });
});
