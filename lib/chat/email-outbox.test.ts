import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  EMAIL_OUTBOX_BASE_RETRY_MS,
  EMAIL_OUTBOX_MAX_ATTEMPTS,
  EMAIL_OUTBOX_MAX_RETRY_MS,
  createEmailOutboxStore,
  createResendEmailSender,
  nextEmailRetryDelayMs,
  processEmailOutboxBatch,
  resolveEmailOutboxFailure,
  resumeEmailIdempotencyKey,
  type EmailOutboxRecord,
  type EmailOutboxStore,
} from "./email-outbox";

const NOW = new Date("2026-10-10T12:00:00.000Z");

/* ── idempotency key ──────────────────────────────────────────────── */

describe("resumeEmailIdempotencyKey", () => {
  it("is the sha256 of conversation_id + message_id and is stable", () => {
    const key = resumeEmailIdempotencyKey({
      conversationId: "conversation-1",
      messageId: "message-1",
    });
    const expected = createHash("sha256")
      .update("conversation-1message-1", "utf8")
      .digest("hex");
    expect(key).toBe(expected);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(
      resumeEmailIdempotencyKey({ conversationId: "conversation-1", messageId: "message-1" })
    ).toBe(key);
  });

  it("differs per reply and per conversation", () => {
    const base = resumeEmailIdempotencyKey({
      conversationId: "conversation-1",
      messageId: "message-1",
    });
    expect(
      resumeEmailIdempotencyKey({ conversationId: "conversation-1", messageId: "message-2" })
    ).not.toBe(base);
    expect(
      resumeEmailIdempotencyKey({ conversationId: "conversation-2", messageId: "message-1" })
    ).not.toBe(base);
  });
});

/* ── retry policy ─────────────────────────────────────────────────── */

describe("nextEmailRetryDelayMs", () => {
  it("grows exponentially from the base delay", () => {
    expect(nextEmailRetryDelayMs(1)).toBe(EMAIL_OUTBOX_BASE_RETRY_MS);
    expect(nextEmailRetryDelayMs(2)).toBe(EMAIL_OUTBOX_BASE_RETRY_MS * 2);
    expect(nextEmailRetryDelayMs(3)).toBe(EMAIL_OUTBOX_BASE_RETRY_MS * 4);
  });

  it("caps the delay and rejects garbage input", () => {
    expect(nextEmailRetryDelayMs(30)).toBe(EMAIL_OUTBOX_MAX_RETRY_MS);
    expect(nextEmailRetryDelayMs(Number.NaN)).toBe(EMAIL_OUTBOX_BASE_RETRY_MS);
    expect(nextEmailRetryDelayMs(-1)).toBe(EMAIL_OUTBOX_BASE_RETRY_MS);
  });
});

describe("resolveEmailOutboxFailure", () => {
  it("schedules a retry while attempts remain", () => {
    const state = resolveEmailOutboxFailure({ attempts: 1, now: NOW, errorCode: "resend_500" });
    expect(state).toEqual({
      status: "pending",
      nextAttemptAt: new Date(NOW.getTime() + EMAIL_OUTBOX_BASE_RETRY_MS),
      attempts: 2,
      errorCode: "resend_500",
    });
  });

  it("fails permanently once the attempt bound is exhausted", () => {
    expect(
      resolveEmailOutboxFailure({
        attempts: EMAIL_OUTBOX_MAX_ATTEMPTS,
        now: NOW,
        errorCode: "resend_500",
      })
    ).toEqual({ status: "failed", attempts: EMAIL_OUTBOX_MAX_ATTEMPTS, errorCode: "resend_500" });
  });
});

/* ── outbox DAL ───────────────────────────────────────────────────── */

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

describe("createEmailOutboxStore", () => {
  const idempotencyKey = resumeEmailIdempotencyKey({
    conversationId: "conversation-1",
    messageId: "message-1",
  });

  it("enqueues pending rows idempotently on the idempotency key", async () => {
    const { pool, calls, setAffectedRows } = createMockPool();
    const store = createEmailOutboxStore(pool);

    setAffectedRows(1);
    expect(
      await store.enqueue({
        id: "outbox-1",
        conversationId: "conversation-1",
        emailType: "visitor_resume",
        idempotencyKey,
        now: NOW,
      })
    ).toBe(true);

    // MariaDB reports 0 affected rows when ON DUPLICATE KEY UPDATE is a no-op.
    setAffectedRows(0);
    expect(
      await store.enqueue({
        id: "outbox-2",
        conversationId: "conversation-1",
        emailType: "visitor_resume",
        idempotencyKey,
        now: NOW,
      })
    ).toBe(false);

    const [{ sql, params }] = calls;
    expect(sql).toContain("INSERT INTO chat_email_outbox");
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(sql).toContain("id = id");
    expect(params).toEqual([
      "outbox-1",
      "conversation-1",
      "visitor_resume",
      idempotencyKey,
      NOW,
      NOW,
    ]);
    // The outbox never stores a message body.
    expect(sql).not.toContain("body");
  });

  it("treats a duplicate-key race as an already-enqueued row", async () => {
    const { pool } = createMockPool();
    const failing = {
      execute: vi.fn(async () => {
        const error = new Error("dup") as Error & { code: string };
        error.code = "ER_DUP_ENTRY";
        throw error;
      }),
      query: vi.fn(),
    } as never;
    const store = createEmailOutboxStore(failing);
    expect(
      await store.enqueue({
        id: "outbox-1",
        conversationId: "conversation-1",
        emailType: "visitor_resume",
        idempotencyKey,
        now: NOW,
      })
    ).toBe(false);
    void pool;
  });

  it("claims a bounded batch of due pending rows atomically", async () => {
    const { pool, calls, setRows, setAffectedRows } = createMockPool();
    const store = createEmailOutboxStore(pool);

    setRows([{ id: "outbox-1" }, { id: "outbox-2" }]);
    setAffectedRows(1);
    const claimed = await store.claimDue({ limit: 10, now: NOW });

    expect(claimed).toHaveLength(2);
    expect(claimed[0]).toMatchObject({ id: "outbox-1" });
    const select = calls[0];
    expect(select.sql).toContain("FROM chat_email_outbox");
    expect(select.sql).toContain("status = 'pending'");
    expect(select.sql).toContain("LIMIT ?");
    expect(select.params[0]).toBeInstanceOf(Date);
    expect(select.params[1]).toBeInstanceOf(Date);
    expect(select.params[2]).toBe(10);
    // Each candidate is claimed with a conditional update; only the winner is returned.
    const claimUpdate = calls[1];
    expect(claimUpdate.sql).toContain("SET status = 'processing'");
    expect(claimUpdate.sql).toContain("WHERE id = ? AND status = 'pending'");
  });

  it("skips a row lost to a concurrent claim", async () => {
    // First claim succeeds, second reports 0 affected rows (lost race).
    const affected = [1, 0];
    let index = 0;
    const mockExecute = vi.fn(async (sql: string) => {
      if (sql.startsWith("SELECT")) {
        return [
          [
            { id: "outbox-1", conversation_id: "conversation-1" },
            { id: "outbox-2", conversation_id: "conversation-1" },
          ],
          { fieldCount: 0 },
        ];
      }
      return [{ affectedRows: affected[index++] ?? 0 }, { fieldCount: 0 }];
    });
    const dynamicPool = { execute: mockExecute, query: mockExecute } as never;
    const dynamicStore = createEmailOutboxStore(dynamicPool);
    const result = await dynamicStore.claimDue({ limit: 5, now: NOW });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("outbox-1");
  });

  it("marks rows sent, retrying or failed with bound parameters", async () => {
    const { pool, calls } = createMockPool();
    const store = createEmailOutboxStore(pool);

    await store.markSent({ id: "outbox-1", now: NOW });
    await store.markRetry({
      id: "outbox-1",
      attempts: 2,
      nextAttemptAt: new Date(NOW.getTime() + 120_000),
      errorCode: "resend_500",
      now: NOW,
    });
    await store.markFailed({ id: "outbox-1", errorCode: "resend_400", now: NOW });

    expect(calls[0].sql).toContain("SET status = 'sent'");
    expect(calls[0].params).toEqual([NOW, NOW, "outbox-1"]);
    expect(calls[1].sql).toContain("SET status = 'pending'");
    expect(calls[1].params).toEqual([
      2,
      new Date(NOW.getTime() + 120_000),
      "resend_500",
      NOW,
      "outbox-1",
    ]);
    expect(calls[2].sql).toContain("SET status = 'failed'");
    expect(calls[2].params).toEqual(["resend_400", NOW, "outbox-1"]);
  });

  it("maps snake_case rows to records", async () => {
    const { pool, setRows } = createMockPool();
    const store = createEmailOutboxStore(pool);
    setRows([
      {
        id: "outbox-1",
        conversation_id: "conversation-1",
        email_type: "visitor_resume",
        idempotency_key: idempotencyKey,
        status: "pending",
        attempts: 0,
        next_attempt_at: null,
        last_error_code: null,
        created_at: NOW,
        updated_at: NOW,
        sent_at: null,
      },
    ]);
    const rows = await store.claimDue({ limit: 1, now: NOW });
    const record: EmailOutboxRecord = rows[0];
    expect(record).toEqual({
      id: "outbox-1",
      conversationId: "conversation-1",
      emailType: "visitor_resume",
      idempotencyKey,
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      lastErrorCode: null,
      createdAt: NOW,
      updatedAt: NOW,
      sentAt: null,
    });
  });
});

/* ── batch processing (bounded retries, no body in logs) ──────────── */

function outboxRecord(overrides: Partial<EmailOutboxRecord> = {}): EmailOutboxRecord {
  return {
    id: "outbox-1",
    conversationId: "conversation-1",
    emailType: "visitor_resume",
    idempotencyKey: resumeEmailIdempotencyKey({
      conversationId: "conversation-1",
      messageId: "message-1",
    }),
    status: "processing",
    attempts: 0,
    nextAttemptAt: null,
    lastErrorCode: null,
    createdAt: NOW,
    updatedAt: NOW,
    sentAt: null,
    ...overrides,
  };
}

function batchStore(rows: EmailOutboxRecord[]) {
  return {
    enqueue: vi.fn(),
    claimDue: vi.fn().mockResolvedValue(rows),
    markSent: vi.fn().mockResolvedValue(undefined),
    markRetry: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EmailOutboxStore & {
    markSent: ReturnType<typeof vi.fn>;
    markRetry: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };
}

describe("processEmailOutboxBatch", () => {
  it("mints a resume URL, sends, and marks the row sent", async () => {
    const store = batchStore([outboxRecord()]);
    const sender = { send: vi.fn().mockResolvedValue({ ok: true }) };
    const mintResumeUrl = vi.fn().mockResolvedValue("https://mascercaap.com/es/chat?k=opaque");

    const report = await processEmailOutboxBatch({
      store,
      sender,
      loadRecipient: vi.fn().mockResolvedValue("visitor@example.com"),
      mintResumeUrl,
      now: NOW,
      limit: 10,
    });

    expect(report).toEqual({ claimed: 1, sent: 1, retried: 0, failed: 0 });
    expect(mintResumeUrl).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      now: NOW,
    });
    expect(sender.send).toHaveBeenCalledWith({
      to: "visitor@example.com",
      resumeUrl: "https://mascercaap.com/es/chat?k=opaque",
    });
    expect(store.markSent).toHaveBeenCalledWith({ id: "outbox-1", now: NOW });
  });

  it("retries transient failures with a bounded exponential delay", async () => {
    const store = batchStore([outboxRecord()]);
    const sender = { send: vi.fn().mockResolvedValue({ ok: false, permanent: false }) };

    const report = await processEmailOutboxBatch({
      store,
      sender,
      loadRecipient: vi.fn().mockResolvedValue("visitor@example.com"),
      mintResumeUrl: vi.fn().mockResolvedValue("https://mascercaap.com/es/chat?k=opaque"),
      now: NOW,
      limit: 10,
    });

    expect(report).toEqual({ claimed: 1, sent: 0, retried: 1, failed: 0 });
    expect(store.markRetry).toHaveBeenCalledWith({
      id: "outbox-1",
      attempts: 1,
      nextAttemptAt: new Date(NOW.getTime() + EMAIL_OUTBOX_BASE_RETRY_MS),
      errorCode: "resend_transient",
      now: NOW,
    });
  });

  it("fails permanently on a permanent sender rejection", async () => {
    const store = batchStore([outboxRecord()]);
    const sender = { send: vi.fn().mockResolvedValue({ ok: false, permanent: true }) };

    const report = await processEmailOutboxBatch({
      store,
      sender,
      loadRecipient: vi.fn().mockResolvedValue("visitor@example.com"),
      mintResumeUrl: vi.fn().mockResolvedValue("https://mascercaap.com/es/chat?k=opaque"),
      now: NOW,
      limit: 10,
    });

    expect(report).toEqual({ claimed: 1, sent: 0, retried: 0, failed: 1 });
    expect(store.markFailed).toHaveBeenCalledWith({
      id: "outbox-1",
      errorCode: "resend_permanent",
      now: NOW,
    });
  });

  it("marks the row failed when the attempt bound is exhausted", async () => {
    const store = batchStore([
      outboxRecord({ attempts: EMAIL_OUTBOX_MAX_ATTEMPTS - 1 }),
    ]);
    const sender = { send: vi.fn().mockResolvedValue({ ok: false, permanent: false }) };

    const report = await processEmailOutboxBatch({
      store,
      sender,
      loadRecipient: vi.fn().mockResolvedValue("visitor@example.com"),
      mintResumeUrl: vi.fn().mockResolvedValue("https://mascercaap.com/es/chat?k=opaque"),
      now: NOW,
      limit: 10,
    });

    expect(report).toEqual({ claimed: 1, sent: 0, retried: 0, failed: 1 });
    expect(store.markRetry).not.toHaveBeenCalled();
    expect(store.markFailed).toHaveBeenCalled();
  });

  it("isolates a missing recipient or a sender crash per row", async () => {
    const store = batchStore([outboxRecord(), outboxRecord({ id: "outbox-2" })]);
    const sender = {
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce({ ok: true }),
    };

    const report = await processEmailOutboxBatch({
      store,
      sender,
      loadRecipient: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("visitor@example.com"),
      mintResumeUrl: vi.fn().mockResolvedValue("https://mascercaap.com/es/chat?k=opaque"),
      now: NOW,
      limit: 10,
    });

    expect(report).toEqual({ claimed: 2, sent: 1, retried: 1, failed: 0 });
    expect(store.markFailed).not.toHaveBeenCalled();
    expect(store.markRetry).toHaveBeenCalledTimes(1);
  });

  it("claims nothing when the batch is empty", async () => {
    const store = batchStore([]);
    const report = await processEmailOutboxBatch({
      store,
      sender: { send: vi.fn() },
      loadRecipient: vi.fn(),
      mintResumeUrl: vi.fn(),
      now: NOW,
      limit: 10,
    });
    expect(report).toEqual({ claimed: 0, sent: 0, retried: 0, failed: 0 });
  });
});

/* ── Resend sender (fixed content, no message body) ───────────────── */

describe("createResendEmailSender", () => {
  const env = {
    RESEND_API_KEY: "re_test_key",
    RESEND_FROM_EMAIL: "noreply@mascercaap.com",
  };

  function fetchStub(status: number) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(null, { status });
    });
    return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
  }

  it("posts a fixed-content resume email through the Resend HTTP API", async () => {
    const { fetchImpl, calls } = fetchStub(200);
    const sender = createResendEmailSender(env, fetchImpl);

    const result = await sender.send({
      to: "visitor@example.com",
      resumeUrl: "https://mascercaap.com/es/chat?k=opaque-token",
    });

    expect(result).toEqual({ ok: true });
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    const payload = JSON.parse(String(calls[0].init.body)) as {
      from: string;
      to: string[];
      subject: string;
      html: string;
    };
    expect(payload.from).toBe("noreply@mascercaap.com");
    expect(payload.to).toEqual(["visitor@example.com"]);
    expect(payload.subject).toBe("Tu conversación de chat continúa");
    expect(payload.html).toContain("https://mascercaap.com/es/chat?k=opaque-token");
  });

  it("classifies 4xx as permanent and 5xx/network as transient", async () => {
    for (const status of [400, 403, 404, 413, 422]) {
      const { fetchImpl } = fetchStub(status);
      const sender = createResendEmailSender(env, fetchImpl);
      expect(
        await sender.send({ to: "visitor@example.com", resumeUrl: "https://x.test/k" })
      ).toEqual({ ok: false, permanent: true });
    }
    for (const status of [429, 500, 502]) {
      const { fetchImpl } = fetchStub(status);
      const sender = createResendEmailSender(env, fetchImpl);
      expect(
        await sender.send({ to: "visitor@example.com", resumeUrl: "https://x.test/k" })
      ).toEqual({ ok: false, permanent: false });
    }
    const { fetchImpl } = fetchStub(0);
    (fetchImpl as unknown as { mockImplementation: (fn: () => Promise<never>) => void })
      .mockImplementation(() => Promise.reject(new Error("ECONNRESET")));
    const sender = createResendEmailSender(env, fetchImpl);
    expect(
      await sender.send({ to: "visitor@example.com", resumeUrl: "https://x.test/k" })
    ).toEqual({ ok: false, permanent: false });
  });

  it("resolves to a transient failure when the API key is missing (never throws)", async () => {
    const { fetchImpl, calls } = fetchStub(200);
    const sender = createResendEmailSender({ RESEND_FROM_EMAIL: "noreply@mascercaap.com" }, fetchImpl);
    expect(
      await sender.send({ to: "visitor@example.com", resumeUrl: "https://x.test/k" })
    ).toEqual({ ok: false, permanent: false });
    expect(calls).toHaveLength(0);
  });
});
