import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_VISITOR_PRESENCE_TTL_SECONDS,
  isVisitorPresent,
  notifyOperatorOfVisitorMessage,
  notifyVisitorOfOperatorReply,
} from "./notify";
import { resumeEmailIdempotencyKey } from "./email-outbox";

const NOW = new Date("2026-10-10T12:00:00.000Z");
const OPERATOR_ID = "coordinator@example.com";
const CONVERSATION_ID = "conversation-1";

type Deps = Parameters<typeof notifyOperatorOfVisitorMessage>[0]["deps"];

function createDeps(overrides: Partial<NonNullable<Deps>> = {}): {
  deps: NonNullable<Deps>;
  publish: ReturnType<typeof vi.fn>;
  transport: { send: ReturnType<typeof vi.fn> };
  pushStore: { listByOperator: ReturnType<typeof vi.fn>; deleteByEndpoint: ReturnType<typeof vi.fn> };
  outboxStore: { enqueue: ReturnType<typeof vi.fn> };
  presenceStore: { countFreshSessions: ReturnType<typeof vi.fn> };
  unreadStore: { countUnreadForOperator: ReturnType<typeof vi.fn> };
} {
  const publish = vi.fn();
  const transport = { send: vi.fn().mockResolvedValue({ ok: true }) };
  const pushStore = {
    listByOperator: vi.fn().mockResolvedValue([
      {
        id: "sub-1",
        operatorId: OPERATOR_ID,
        endpoint: "https://push.example.net/one",
        p256dh: "p256dh-value",
        auth: "auth-value",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]),
    deleteByEndpoint: vi.fn().mockResolvedValue(true),
    upsert: vi.fn(),
    deleteByOperatorEndpoint: vi.fn(),
  };
  const outboxStore = {
    enqueue: vi.fn().mockResolvedValue(true),
    claimDue: vi.fn(),
    markSent: vi.fn(),
    markRetry: vi.fn(),
    markFailed: vi.fn(),
  };
  const presenceStore = { countFreshSessions: vi.fn().mockResolvedValue(0) };
  const unreadStore = { countUnreadForOperator: vi.fn().mockResolvedValue(3) };

  const deps = {
    publish,
    transport,
    pushStore,
    outboxStore,
    presenceStore,
    unreadStore,
    operatorId: OPERATOR_ID,
    ...overrides,
  } as unknown as NonNullable<Deps>;

  return { deps, publish, transport, pushStore, outboxStore, presenceStore, unreadStore };
}

/* ── presence definition ──────────────────────────────────────────── */

describe("isVisitorPresent", () => {
  it("counts a fresh, unrevoked, unexpired session row as presence", async () => {
    const store = { countFreshSessions: vi.fn().mockResolvedValue(1) };
    expect(
      await isVisitorPresent({ store, conversationId: CONVERSATION_ID, now: NOW })
    ).toBe(true);
    expect(store.countFreshSessions).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      now: NOW,
      freshBefore: new Date(NOW.getTime() - CHAT_VISITOR_PRESENCE_TTL_SECONDS * 1000),
    });
  });

  it("treats an expired, revoked or missing lease as absence", async () => {
    for (const count of [0]) {
      const store = { countFreshSessions: vi.fn().mockResolvedValue(count) };
      expect(
        await isVisitorPresent({ store, conversationId: CONVERSATION_ID, now: NOW })
      ).toBe(false);
    }
  });

  it("fails closed when the presence store errors", async () => {
    const store = {
      countFreshSessions: vi.fn().mockRejectedValue(new Error("db down")),
    };
    expect(
      await isVisitorPresent({ store, conversationId: CONVERSATION_ID, now: NOW })
    ).toBe(false);
  });
});

/* ── visitor message → coordinator push ───────────────────────────── */

describe("notifyOperatorOfVisitorMessage", () => {
  it("publishes the opaque signal before any push transport call", async () => {
    const order: string[] = [];
    const { deps, transport } = createDeps();
    deps.publish = (() => {
      order.push("publish");
    }) as never;
    transport.send.mockImplementation(async () => {
      order.push("transport");
      return { ok: true };
    });

    await notifyOperatorOfVisitorMessage({
      conversationId: CONVERSATION_ID,
      now: NOW,
      pushEnabled: true,
      deps,
    });

    expect(order).toEqual(["publish", "transport"]);
  });

  it("sends only { unreadCount } — never conversation id, name, phone or body", async () => {
    const { deps, transport, unreadStore } = createDeps();
    unreadStore.countUnreadForOperator.mockResolvedValue(5);

    await notifyOperatorOfVisitorMessage({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      now: NOW,
      pushEnabled: true,
      deps,
    });

    expect(unreadStore.countUnreadForOperator).toHaveBeenCalledWith(OPERATOR_ID);
    expect(transport.send).toHaveBeenCalledTimes(1);
    const [target, payload] = transport.send.mock.calls[0] as [unknown, string];
    expect(payload).toBe('{"unreadCount":5}');
    expect(payload).not.toContain("550e8400");
    expect(payload).not.toContain("Ana");
    expect(payload).not.toContain("phone");
    expect(payload).not.toContain("body");
    expect(JSON.stringify(target)).not.toContain("p256dh-value");
  });

  it("removes a subscription after a verified gone response", async () => {
    const { deps, transport, pushStore } = createDeps();
    transport.send.mockResolvedValue({ ok: false, gone: true });

    await notifyOperatorOfVisitorMessage({
      conversationId: CONVERSATION_ID,
      now: NOW,
      pushEnabled: true,
      deps,
    });

    expect(pushStore.deleteByEndpoint).toHaveBeenCalledWith("https://push.example.net/one");
  });

  it("still publishes the signal while push is disabled, doing no push work", async () => {
    const { deps, publish, transport, unreadStore } = createDeps();

    const outcome = await notifyOperatorOfVisitorMessage({
      conversationId: CONVERSATION_ID,
      now: NOW,
      pushEnabled: false,
      deps,
    });

    expect(publish).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(transport.send).not.toHaveBeenCalled();
    expect(unreadStore.countUnreadForOperator).not.toHaveBeenCalled();
    expect(outcome).toEqual({ published: true, delivered: 0, failed: 0, removed: 0 });
  });

  it("never rejects and never undoes the committed message when deps fail", async () => {
    const { deps, pushStore, transport } = createDeps();
    deps.publish = (() => {
      throw new Error("hub exploded");
    }) as never;
    transport.send.mockRejectedValue(new Error("network down"));
    (pushStore.listByOperator as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db down")
    );

    const outcome = await notifyOperatorOfVisitorMessage({
      conversationId: CONVERSATION_ID,
      now: NOW,
      pushEnabled: true,
      deps,
    });

    expect(outcome).toEqual({ published: false, delivered: 0, failed: 0, removed: 0 });
    expect(pushStore.deleteByEndpoint).not.toHaveBeenCalled();
  });

  it("degrades to no push when the unread count cannot be derived", async () => {
    const { deps, transport, unreadStore } = createDeps();
    unreadStore.countUnreadForOperator.mockRejectedValue(new Error("db down"));

    const outcome = await notifyOperatorOfVisitorMessage({
      conversationId: CONVERSATION_ID,
      now: NOW,
      pushEnabled: true,
      deps,
    });

    expect(transport.send).not.toHaveBeenCalled();
    expect(outcome).toEqual({ published: true, delivered: 0, failed: 0, removed: 0 });
  });
});

/* ── operator reply → resume email outbox ─────────────────────────── */

describe("notifyVisitorOfOperatorReply", () => {
  it("publishes the opaque signal before enqueueing anything", async () => {
    const order: string[] = [];
    const { deps, outboxStore } = createDeps();
    deps.publish = (() => {
      order.push("publish");
    }) as never;
    outboxStore.enqueue.mockImplementation(async () => {
      order.push("enqueue");
      return true;
    });

    await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-1",
      now: NOW,
      emailEnabled: true,
      deps,
    });

    expect(order).toEqual(["publish", "enqueue"]);
  });

  it("enqueues an idempotent resume email only while the visitor is absent", async () => {
    const { deps, outboxStore, presenceStore } = createDeps();
    presenceStore.countFreshSessions.mockResolvedValue(0);

    const outcome = await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-1",
      now: NOW,
      emailEnabled: true,
      deps,
    });

    expect(presenceStore.countFreshSessions).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      now: NOW,
      freshBefore: new Date(NOW.getTime() - CHAT_VISITOR_PRESENCE_TTL_SECONDS * 1000),
    });
    expect(outboxStore.enqueue).toHaveBeenCalledWith({
      id: expect.any(String),
      conversationId: CONVERSATION_ID,
      emailType: "visitor_resume",
      idempotencyKey: resumeEmailIdempotencyKey({
        conversationId: CONVERSATION_ID,
        messageId: "message-1",
      }),
      now: NOW,
    });
    expect(outcome).toEqual({ published: true, emailQueued: true });
  });

  it("does not enqueue while a fresh presence lease exists", async () => {
    const { deps, outboxStore, presenceStore } = createDeps();
    presenceStore.countFreshSessions.mockResolvedValue(1);

    const outcome = await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-1",
      now: NOW,
      emailEnabled: true,
      deps,
    });

    expect(outboxStore.enqueue).not.toHaveBeenCalled();
    expect(outcome).toEqual({ published: true, emailQueued: false });
  });

  it("skips presence and enqueue work while email is disabled, still publishing", async () => {
    const { deps, publish, outboxStore, presenceStore } = createDeps();

    const outcome = await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-1",
      now: NOW,
      emailEnabled: false,
      deps,
    });

    expect(publish).toHaveBeenCalledWith(CONVERSATION_ID);
    expect(presenceStore.countFreshSessions).not.toHaveBeenCalled();
    expect(outboxStore.enqueue).not.toHaveBeenCalled();
    expect(outcome).toEqual({ published: true, emailQueued: false });
  });

  it("reports a duplicate enqueue as not queued without throwing", async () => {
    const { deps, outboxStore, presenceStore } = createDeps();
    presenceStore.countFreshSessions.mockResolvedValue(0);
    outboxStore.enqueue.mockResolvedValue(false);

    const outcome = await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-1",
      now: NOW,
      emailEnabled: true,
      deps,
    });

    expect(outcome).toEqual({ published: true, emailQueued: false });
  });

  it("never rejects when presence or outbox storage fails", async () => {
    const { deps, publish, presenceStore, outboxStore } = createDeps();
    presenceStore.countFreshSessions.mockRejectedValue(new Error("db down"));
    outboxStore.enqueue.mockRejectedValue(new Error("db down"));

    const outcomeAbsent = await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-1",
      now: NOW,
      emailEnabled: true,
      deps,
    });
    expect(outcomeAbsent).toEqual({ published: true, emailQueued: false });

    presenceStore.countFreshSessions.mockResolvedValue(0);
    const outcomeEnqueue = await notifyVisitorOfOperatorReply({
      conversationId: CONVERSATION_ID,
      messageId: "message-2",
      now: NOW,
      emailEnabled: true,
      deps,
    });
    expect(outcomeEnqueue).toEqual({ published: true, emailQueued: false });
    expect(publish).toHaveBeenCalledTimes(2);
  });
});
