import { afterEach, describe, expect, it, vi } from "vitest";

// server-only throws outside Next.js; mock it everywhere before importing.
vi.mock("server-only", () => ({}));

import { NextResponse } from "next/server";

import { CHAT_GENERIC_ERROR_CODE } from "@/lib/chat/types";

const INTERNAL_SECRET = "internal-secret-value";

const ZERO_REPORT = { scanned: 0, purged: 0, skipped_open: 0, dryRun: false };

type RunFn = ReturnType<typeof vi.fn>;

async function loadRoute(options: {
  enabled?: boolean;
  retention?: boolean;
  authStatus?: number | null;
  runCleanup?: RunFn;
} = {}) {
  vi.resetModules();

  const runCleanup =
    options.runCleanup ?? vi.fn().mockResolvedValue({ ...ZERO_REPORT });
  const auth = vi
    .fn()
    .mockResolvedValue(
      options.authStatus == null
        ? null
        : NextResponse.json({ error: "boundary" }, { status: options.authStatus })
    );

  vi.doMock("@/lib/chat/config", () => ({
    chatConfig: { enabled: options.enabled ?? true, retention: options.retention ?? true },
  }));
  vi.doMock("@/lib/chat/db", () => ({ getChatPool: () => ({}) }));
  vi.doMock("@/lib/admin/auth", () => ({ requireAdminAuth: auth }));
  vi.doMock("@/lib/chat/retention", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chat/retention")>();
    return {
      ...actual,
      runRetentionCleanup: runCleanup,
      createRetentionCandidateStore: () => ({ listCandidates: vi.fn() }),
    };
  });

  const route = await import("./route");
  return { POST: route.POST, runCleanup, auth };
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
    `http://localhost/api/chat/internal/retention-cleanup${input.query ?? ""}`,
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
  vi.doUnmock("@/lib/chat/retention");
});

describe("POST /api/chat/internal/retention-cleanup", () => {
  it("rejects a request with neither the shared secret nor an admin session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, runCleanup } = await loadRoute({ authStatus: 401 });

    const res = await POST(postRequest({ secret: null, query: "?olderThanDays=30" }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: CHAT_GENERIC_ERROR_CODE,
    });
    expect(runCleanup).not.toHaveBeenCalled();
  });

  it("rejects a wrong shared secret even with an invalid admin session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, runCleanup } = await loadRoute({ authStatus: 401 });

    const res = await POST(postRequest({ secret: "wrong-secret", query: "?olderThanDays=30" }));
    expect(res.status).toBe(401);
    expect(runCleanup).not.toHaveBeenCalled();
  });

  it("authorizes with the shared secret or with a valid admin session", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);

    const withSecret = await loadRoute({ authStatus: 401 });
    expect(
      (await withSecret.POST(postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30" })))
        .status
    ).toBe(200);

    const withSession = await loadRoute({ authStatus: null });
    expect(
      (await withSession.POST(postRequest({ secret: null, query: "?olderThanDays=30" }))).status
    ).toBe(200);
  });

  it("returns 404 while the chat module is disabled", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, runCleanup } = await loadRoute({ enabled: false });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30" }));
    expect(res.status).toBe(404);
    expect(runCleanup).not.toHaveBeenCalled();
  });

  it("returns a generic 400 when the retention window is missing (no default period)", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, runCleanup } = await loadRoute();

    const res = await POST(postRequest({ secret: INTERNAL_SECRET }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: CHAT_GENERIC_ERROR_CODE,
    });
    expect(runCleanup).not.toHaveBeenCalled();
  });

  it.each([
    ["not a number", "?olderThanDays=abc"],
    ["zero", "?olderThanDays=0"],
    ["negative", "?olderThanDays=-1"],
    ["fractional", "?olderThanDays=1.5"],
    ["absurdly large", "?olderThanDays=999999"],
    ["empty", "?olderThanDays="],
  ])("returns a generic 400 for %s", async (_label, query) => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, runCleanup } = await loadRoute();

    const res = await POST(postRequest({ secret: INTERNAL_SECRET, query }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: CHAT_GENERIC_ERROR_CODE,
    });
    expect(runCleanup).not.toHaveBeenCalled();
  });

  it("drains nothing while CHAT_RETENTION_ENABLED is off (kill switch)", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const { POST, runCleanup } = await loadRoute({ retention: false });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { scanned: 0, purged: 0, skipped_open: 0, dryRun: false },
    });
    expect(runCleanup).not.toHaveBeenCalled();
  });

  it("runs the cleanup with the requested window and reports counts only", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const runCleanup = vi.fn().mockResolvedValue({
      scanned: 3,
      purged: 2,
      skipped_open: 1,
      dryRun: false,
    });
    const { POST } = await loadRoute({ runCleanup });

    const res = await POST(
      postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=45&limit=5" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      success: true,
      data: { scanned: 3, purged: 2, skipped_open: 1, dryRun: false },
    });
    expect(text).not.toContain("@");
    expect(text).not.toContain("conversation");

    const input = runCleanup.mock.calls[0][0] as {
      olderThanDays: number;
      limit: number;
      dryRun?: boolean;
      now: Date;
    };
    expect(input.olderThanDays).toBe(45);
    expect(input.limit).toBe(5);
    expect(input.dryRun).toBe(false);
    expect(input.now).toBeInstanceOf(Date);
    expect(Object.keys(input).sort()).toEqual([
      "dryRun",
      "limit",
      "metrics",
      "now",
      "olderThanDays",
      "purgeDatabase",
      "store",
    ]);
  });

  it("clamps the batch limit to a bounded positive integer", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);

    const oversized = await loadRoute({
      runCleanup: vi.fn().mockResolvedValue({ ...ZERO_REPORT }),
    });
    await oversized.POST(
      postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30&limit=100000" })
    );
    expect(
      (oversized.runCleanup.mock.calls[0][0] as { limit: number }).limit
    ).toBe(50);

    const malformed = await loadRoute({
      runCleanup: vi.fn().mockResolvedValue({ ...ZERO_REPORT }),
    });
    await malformed.POST(
      postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30&limit=abc" })
    );
    expect(
      (malformed.runCleanup.mock.calls[0][0] as { limit: number }).limit
    ).toBe(10);
  });

  it("runs a dry run without purging anything", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const runCleanup = vi.fn().mockResolvedValue({ ...ZERO_REPORT, dryRun: true });
    const { POST } = await loadRoute({ runCleanup });

    const res = await POST(
      postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30&dryRun=1" })
    );
    expect(res.status).toBe(200);
    expect(runCleanup.mock.calls[0][0]).toMatchObject({ dryRun: true });
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { scanned: 0, purged: 0, skipped_open: 0, dryRun: true },
    });
  });

  it("never leaks the shared secret or a stack trace on failure", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://mascercaap.com");
    vi.stubEnv("CHAT_INTERNAL_SECRET", INTERNAL_SECRET);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const runCleanup = vi.fn().mockRejectedValue(new Error(`boom ${INTERNAL_SECRET}`));
    const { POST } = await loadRoute({ runCleanup });

    const res = await POST(postRequest({ secret: INTERNAL_SECRET, query: "?olderThanDays=30" }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(INTERNAL_SECRET);
    expect(JSON.parse(text)).toEqual({
      success: true,
      data: { scanned: 0, purged: 0, skipped_open: 0, dryRun: false },
    });
    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({ scope: "chat", event: "chat_retention_error" })
    );
    for (const call of consoleError.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(INTERNAL_SECRET);
    }
  });
});
