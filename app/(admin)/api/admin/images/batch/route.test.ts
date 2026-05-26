import { afterEach, describe, expect, it, vi } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────

function createFormData(
  entries: Array<{ fileIndex: number; productId: string }>,
  fileOpts?: { content?: string; name?: string; type?: string },
): FormData {
  const fd = new FormData();
  fd.append("entries", JSON.stringify(entries));

  const content = fileOpts?.content ?? "fake-image-data";
  const defaultName = "test-image.webp";
  const type = fileOpts?.type ?? "image/webp";

  for (const entry of entries) {
    const blob = new Blob([content], { type });
    const file = new File([blob], fileOpts?.name ?? `file_${entry.fileIndex}_${defaultName}`, { type });
    fd.append(`file_${entry.fileIndex}`, file);
  }

  return fd;
}

function createRequest(formData: FormData, origin?: string): Request {
  const headers: Record<string, string> = {};
  if (origin) headers["Origin"] = origin;
  return new Request("http://localhost/api/admin/images/batch", {
    method: "POST",
    headers,
    body: formData,
  });
}

// ── Mocks compartidos ────────────────────────────────────────────────

function createDefaultSupabaseMock() {
  const mockStorageFrom = vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn(() => ({
      data: { publicUrl: "https://example.com/storage/test-uuid.webp" },
    })),
  }));

  const mockSelectIn = vi.fn().mockResolvedValue({
    data: [
      { id: "prod-img-null",   image: null },
      { id: "prod-img-exists", image: "existing.jpg" },
      { id: "prod-extra",      image: null },
    ],
    error: null,
  });

  const mockSelect = vi.fn(() => ({ in: mockSelectIn }));
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

  return {
    storage: {
      from: mockStorageFrom,
    },
    from: vi.fn((table: string) => {
      if (table === "products") {
        return { select: mockSelect, update: mockUpdate };
      }
      return { select: vi.fn(() => ({ in: vi.fn() })), update: vi.fn(() => ({ eq: vi.fn() })) };
    }),
    // Exponemos referencias para asserts
    _mockSelectIn: mockSelectIn,
    _mockUpdateEq: mockUpdateEq,
    _mockStorageFrom: mockStorageFrom,
  };
}

type SupabaseMock = ReturnType<typeof createDefaultSupabaseMock>;

async function loadRoute(
  authResult: null | Response = null,
  supabaseMock?: SupabaseMock,
  csrfOrigin?: string,
) {
  vi.resetModules();

  const mockAuth = vi.fn().mockResolvedValue(authResult);
  vi.doMock("@/lib/admin/auth", () => ({
    requireAdminAuth: mockAuth,
  }));

  const mockSupabase = supabaseMock ?? createDefaultSupabaseMock();
  vi.doMock("@/lib/admin/supabase-service", () => ({
    supabase: mockSupabase,
  }));

  // Mock crypto for deterministic UUID
  vi.doMock("crypto", () => ({
    randomUUID: vi.fn(() => "test-uuid-0000"),
  }));

  // Mock revalidatePath to avoid Next.js static generation store invariant
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
  }));

  const route = await import("./route");
  return { ...route, mockAuth, mockSupabase };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("POST /api/admin/images/batch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ── Auth ──────────────────────────────────────────────────────────

  it("rejects unauthenticated request (401)", async () => {
    const unauthorized = new Response(null, { status: 401 });
    const { POST } = await loadRoute(unauthorized);

    const fd = createFormData([{ fileIndex: 0, productId: "prod-img-null" }]);
    const res = await POST(createRequest(fd));
    expect(res.status).toBe(401);
  });

  // ── CSRF ──────────────────────────────────────────────────────────

  it("rejects cross-origin request in production (403)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await loadRoute(null);

    const fd = createFormData([{ fileIndex: 0, productId: "prod-img-null" }]);
    const res = await POST(createRequest(fd, "https://evil.com"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("allows same-origin request in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await loadRoute(null);

    const fd = createFormData([{ fileIndex: 0, productId: "prod-img-null" }]);
    const res = await POST(createRequest(fd, "https://mascercap.com"));
    // Should be past CSRF, now it fails at entries validation since
    // we didn't stub supabase storage beyond default — but that's fine,
    // we just care that it's not 403.
    expect(res.status).not.toBe(403);
  });

  // ── Batch validation ─────────────────────────────────────────────

  it("rejects missing entries metadata (400)", async () => {
    const { POST } = await loadRoute();
    const fd = new FormData();
    fd.append("file_0", new File(["data"], "test.webp", { type: "image/webp" }));
    // No "entries" field

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("entries");
  });

  it("rejects invalid entries JSON (400)", async () => {
    const { POST } = await loadRoute();
    const fd = new FormData();
    fd.append("entries", "not-json");

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("JSON");
  });

  it("rejects empty entries array (400)", async () => {
    const { POST } = await loadRoute();
    const fd = createFormData([]);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("no vacío");
  });

  it("rejects batch exceeding MAX_BATCH_SIZE (400)", async () => {
    const { POST } = await loadRoute();
    const entries = Array.from({ length: 21 }, (_, i) => ({
      fileIndex: i,
      productId: `prod-${i}`,
    }));
    const fd = createFormData(entries);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Máximo");
  });

  it("rejects invalid fileIndex (non-integer) (400)", async () => {
    const { POST } = await loadRoute();
    const fd = new FormData();
    fd.append("entries", JSON.stringify([{ fileIndex: 0.5, productId: "prod-img-null" }]));

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
  });

  it("rejects duplicate fileIndex (400)", async () => {
    const { POST } = await loadRoute();
    const fd = createFormData([
      { fileIndex: 0, productId: "prod-img-null" },
      { fileIndex: 0, productId: "prod-img-exists" },
    ]);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("duplicado");
  });

  it("rejects duplicate productId in same batch (400)", async () => {
    const { POST } = await loadRoute();
    const fd = createFormData([
      { fileIndex: 0, productId: "prod-img-null" },
      { fileIndex: 1, productId: "prod-img-null" },
    ]);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("asignado a más de un archivo");
  });

  it("rejects empty productId (400)", async () => {
    const { POST } = await loadRoute();
    const fd = new FormData();
    fd.append("entries", JSON.stringify([{ fileIndex: 0, productId: "  " }]));

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(400);
  });

  // ── File-level validation (per-entry errors, not 400) ────────────

  it("returns error result when file is missing for an entry", async () => {
    const { POST } = await loadRoute();
    const fd = new FormData();
    fd.append("entries", JSON.stringify([{ fileIndex: 99, productId: "prod-img-null" }]));
    // No file_99 appended

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toContain("No se encontró");
  });

  it("returns error result for invalid file type", async () => {
    const { POST } = await loadRoute();
    const fd = createFormData(
      [{ fileIndex: 0, productId: "prod-img-null" }],
      { type: "image/gif" },
    );

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toContain("Tipo no permitido");
  });

  it("returns error result for oversized file (>2MB)", async () => {
    const { POST } = await loadRoute();
    const bigContent = "x".repeat(2.5 * 1024 * 1024); // ~2.5MB
    const fd = createFormData(
      [{ fileIndex: 0, productId: "prod-img-null" }],
      { content: bigContent },
    );

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toContain("2MB");
  });

  it("returns error result when product is not found in DB", async () => {
    const mockSupabase = createDefaultSupabaseMock();
    // Make select().in() return empty
    mockSupabase._mockSelectIn.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { POST } = await loadRoute(null, mockSupabase);
    const fd = createFormData([{ fileIndex: 0, productId: "nonexistent-id" }]);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toContain("no encontrado");
  });

  // ── Happy path ────────────────────────────────────────────────────

  it("processes valid batch successfully", async () => {
    const mockSupabase = createDefaultSupabaseMock();
    const { POST } = await loadRoute(null, mockSupabase);

    const fd = createFormData([
      { fileIndex: 0, productId: "prod-img-null" },
      { fileIndex: 1, productId: "prod-img-exists" },
    ]);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[0].status).toBe("done");
    expect(body.results[1].status).toBe("done");
    expect(body.results[0].url).toBe("https://example.com/storage/test-uuid.webp");
  });

  it("does not fail entire batch when one entry has error", async () => {
    const mockSupabase = createDefaultSupabaseMock();
    // Hacer que el upload falle para el segundo archivo
    const mockStorageFrom = vi.fn();
    mockStorageFrom
      .mockReturnValueOnce({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/storage/ok.webp" },
        })),
      })
      .mockReturnValueOnce({
        upload: vi.fn().mockResolvedValue({ error: new Error("Storage quota exceeded") }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "" },
        })),
      });

    const mockSupabaseWithError = {
      ...createDefaultSupabaseMock(),
      storage: { from: mockStorageFrom },
    };

    const { POST } = await loadRoute(null, mockSupabaseWithError);

    const fd = createFormData([
      { fileIndex: 0, productId: "prod-img-null" },
      { fileIndex: 1, productId: "prod-img-exists" },
    ]);

    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[0].status).toBe("done");
    expect(body.results[1].status).toBe("error");
  });

  it("updates product image in DB on successful upload", async () => {
    const mockSupabase = createDefaultSupabaseMock();
    const { POST } = await loadRoute(null, mockSupabase);

    const fd = createFormData([{ fileIndex: 0, productId: "prod-img-null" }]);
    const res = await POST(createRequest(fd));
    expect(res.status).toBe(200);

    // Verificar que se llamó a update con la URL pública
    expect(mockSupabase._mockUpdateEq).toHaveBeenCalledWith("id", "prod-img-null");
  });
});
