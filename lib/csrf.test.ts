import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin } from "./csrf";

const PRODUCTION_ORIGIN = "https://mascercaap.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

function createRequest(origin: string | null, method = "POST"): Request {
  const headers: Record<string, string> = {};
  if (origin) headers["Origin"] = origin;
  return new Request("http://localhost/api/admin/images/batch", {
    method,
    headers,
  });
}

describe("assertSameOrigin", () => {
  it("returns null in development (bypass)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = createRequest("http://evil.com");
    expect(assertSameOrigin(req)).toBeNull();
  });

  it("returns null in test (bypass)", () => {
    // NODE_ENV defaults to "test" in vitest
    const req = createRequest("http://evil.com");
    expect(assertSameOrigin(req)).toBeNull();
  });

  describe("in production", () => {
    it("returns null when Origin matches ALLOWED_ORIGIN", () => {
      vi.stubEnv("NODE_ENV", "production");
      const req = createRequest(PRODUCTION_ORIGIN);
      expect(assertSameOrigin(req)).toBeNull();
    });

    it("returns 403 when Origin is wrong", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const req = createRequest("https://evil.com");
      const res = assertSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(403);
      const body = await res!.json();
      expect(body.error).toBe("Forbidden");
    });

    it("returns 403 when Origin is null", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const req = createRequest(null);
      const res = assertSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(403);
    });

    it("returns 403 when Origin is empty string", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const req = createRequest("");
      const res = assertSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(403);
    });

    it("returns 403 for subdomain origin", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const req = createRequest("https://admin.mascercap.com");
      const res = assertSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(403);
    });
  });
});
