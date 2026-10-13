import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";

const INTERNAL_SECRET = "internal-secret-value";

type ProcessFn = ReturnType<typeof vi.fn>;

async function loadRoute(options: {
  enabled?: boolean;
  email?: boolean;
  authStatus?: number | null;
  processBatch?: ProcessFn;
} = {}) {
  vi.resetModules();

  const processBatch =
    options.processBatch ??
    vi.fn().mockResolvedValue({ claimed: 0, sent: 0, retried: 0, failed: 0 });
  const auth = vi
    .fn()
    .mockResolvedValue(
      options.authStatus == null
        ? null
        : NextResponse.json({ error: "boundary" }, { status: options.authStatus })
    );

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true, email: options.email ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/admin/auth", () => ({ requireAdminAuth: auth }));
  vi.doMock("@/lib/chat/email-outbox", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/email-outbox")>();
    return {
      ...actual,
      createEmailOutboxStore: () => ({
        enqueue: vi.fn(),
        claimDue: vi.fn().mockResolvedValue([]),
        markSent: vi.fn(),
        markRetry: vi.fn(),
        markFailed: vi.fn(),
      }),
      processEmailOutboxBatch: processBatch,
    };
  });

  const route = await import("./route");
  return { POST: route.POST, processBatch, auth };
}

function postRequest(input: {
  query?: string;
  secret?: string | null;
  origin?: string | null;
}): Request {
  const headers: Record<string, string> = {};
  const origin = input.origin === undefined ? "https://mascercaap.com" : input.origin;
  if (origin) headers.origin = origin;
  if (input.secret !== null && input.secret !== undefined) {
    headers["x-chat-internal-secret"] = input.secret;
  }
  return new Request(
    `http://localhost/api/chat/internal/email-worker${input.query ?? ""}`,
    { method: "POST", headers }
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("@/lib/chat/config");
  vi.doUnmock("@/lib/chat/db");
  vi.doUnmock("@/lib/admin/auth");
  vi.doUnmock("@/lib/chat/email-outbox");
});

describe("POST /api/chat/internal/email-worker", () => {
  it("rejects a request with neither the shared secret nor an admin session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, processBatch } = await loadRoute({ authStatus: 401 });

    const res = await POST(postRequest({ secret: null }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: CHAT_GENERIC_ERROR_CODE,
    });
    expect(processBatch).not.toHaveBeenCalled();
  });

  it("rejects a wrong shared secret even with an invalid admin session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, processBatch } = await loadRoute({ authStatus: 401 });
    expect((await POST(postRequest({ secret: "wrong-secret" }))).status).toBe(401);
    expect(processBatch).not.toHaveBeenCalled();
  });

  it("authorizes with the shared secret or with a valid admin session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);

    const withSecret = await loadRoute({ authStatus: 401 });
    expect((await withSecret.POST(postRequest({ secret: INTERNAL_SECRET }))).status).toBe(200);

    const withSession = await loadRoute({ authStatus: null });
    expect((await withSession.POST(postRequest({ secret: null }))).status).toBe(200);
  });

  it("returns 404 while the chat module is disabled", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, processBatch } = await loadRoute({ enabled: false });
    expect((await POST(postRequest({ secret: INTERNAL_SECRET }))).status).toBe(404);
    expect(processBatch).not.toHaveBeenCalled();
  });

  it("drains nothing while CHAT_EMAIL_ENABLED is off (kill switch)", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, processBatch } = await loadRoute({ email: false });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { claimed: 0, sent: 0, retried: 0, failed: 0 },
    });
    expect(processBatch).not.toHaveBeenCalled();
  });

  it("processes a bounded batch and reports counts only", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const processBatch = vi.fn().mockResolvedValue({
      claimed: 3,
      sent: 2,
      retried: 1,
      failed: 0,
    });
    const { POST } = await loadRoute({ processBatch });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET, query: "?limit=2" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      success: true,
      data: { claimed: 3, sent: 2, retried: 1, failed: 0 },
    });
    // The response never carries ids, recipients, tokens or links.
    expect(text).not.toContain("outbox");
    expect(text).not.toContain("@");
    expect(text).not.toContain("http");

    const input = processBatch.mock.calls[0][0] as {
      limit: number;
      dryRun: boolean;
      now: Date;
    };
    expect(input.limit).toBe(2);
    expect(input.dryRun).toBe(false);
    expect(input.now).toBeInstanceOf(Date);
  });

  it("clamps an oversized or malformed batch limit", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);

    const oversized = await loadRoute({ processBatch: vi.fn().mockResolvedValue({ claimed: 0, sent: 0, retried: 0, failed: 0 }) });
    await oversized.POST(postRequest({ secret: INTERNAL_SECRET, query: "?limit=1000" }));
    expect(
      (oversized.processBatch.mock.calls[0][0] as { limit: number }).limit
    ).toBe(25);

    const malformed = await loadRoute({ processBatch: vi.fn().mockResolvedValue({ claimed: 0, sent: 0, retried: 0, failed: 0 }) });
    await malformed.POST(postRequest({ secret: INTERNAL_SECRET, query: "?limit=abc" }));
    expect(
      (malformed.processBatch.mock.calls[0][0] as { limit: number }).limit
    ).toBe(10);
  });

  it("runs a dry run without claiming or sending anything", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const processBatch = vi.fn().mockResolvedValue({ claimed: 0, sent: 0, retried: 0, failed: 0 });
    const { POST } = await loadRoute({ processBatch });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET, query: "?dryRun=1" }));
    expect(res.status).toBe(200);
    expect(processBatch.mock.calls[0][0]).toMatchObject({ dryRun: true });
  });

  it("never leaks the shared secret or a stack trace on failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const processBatch = vi.fn().mockRejectedValue(new Error(`boom ${INTERNAL_SECRET}`));
    const { POST } = await loadRoute({ processBatch });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(INTERNAL_SECRET);
    for (const call of consoleError.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(INTERNAL_SECRET);
    }
  });
});
