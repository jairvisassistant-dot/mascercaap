import { afterEach, describe, expect, it, vi } from "vitest"

const validOrder = {
  nombre:          "Carlos Ruiz",
  email:           "carlos@example.com",
  whatsapp_number: null,
  consentAccepted: true,
  profile:         "cafeteria",
  items: [
    { productType: "Pulpas", fruit: "Maracuyá", presentation: "1000g", quantity: 10 },
  ],
} as const

function createRequest(body: unknown, ip = "198.51.100.10") {
  return new Request("http://localhost/api/orders", {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body:    JSON.stringify(body),
  })
}

async function loadPost(
  fetchMock     = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
  supabaseInsert = vi.fn().mockResolvedValue({ error: null })
) {
  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === "products") {
        return {
          select: vi.fn(() => ({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        }
      }
      return { insert: supabaseInsert }
    }),
  }

  vi.resetModules()
  vi.spyOn(global, "fetch").mockImplementation(fetchMock)
  vi.doMock("@/lib/supabase", () => ({ supabasePublic: mockSupabase }))

  const route = await import("./route")
  return { POST: route.POST, fetchMock, supabaseInsert, mockSupabase }
}

describe("POST /api/orders", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase")
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns 400 for invalid payload (item quantity 0)", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, fetchMock } = await loadPost()

    const badOrder = { ...validOrder, items: [{ ...validOrder.items[0], quantity: 0 }] }
    const res = await POST(createRequest(badOrder))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 400 when items array is empty", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST } = await loadPost()

    const res = await POST(createRequest({ ...validOrder, items: [] }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when both email and whatsapp are missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST } = await loadPost()

    const res = await POST(createRequest({ ...validOrder, email: null, whatsapp_number: null }))
    expect(res.status).toBe(400)
  })

  it("returns 503 without RESEND_API_KEY in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("RESEND_API_KEY", "")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST } = await loadPost()

    const res = await POST(createRequest(validOrder))
    expect(res.status).toBe(503)
  })

  it("returns dev success without fetch when key missing outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("RESEND_API_KEY", "")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, fetchMock } = await loadPost()

    const res = await POST(createRequest(validOrder))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true, dev: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("inserts lead in Supabase with tipo:pedido and fuente:order_assistant", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, supabaseInsert, mockSupabase } = await loadPost()

    const res = await POST(createRequest(validOrder))
    expect(res.status).toBe(200)
    expect(mockSupabase.from).toHaveBeenCalledWith("leads")
    expect(supabaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "pedido", fuente: "order_assistant" })
    )
  })

  it("producto_interes includes fruit and presentation from all items", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, supabaseInsert } = await loadPost()

    const multiOrder = {
      ...validOrder,
      items: [
        { productType: "Pulpas", fruit: "Maracuyá", presentation: "1000g", quantity: 10 },
        { productType: "Pulpas", fruit: "Mora",      presentation: "300g",  quantity: 5  },
      ],
    }
    await POST(createRequest(multiOrder))
    const insertArg = supabaseInsert.mock.calls[0]?.[0] as Record<string, string>
    expect(insertArg.producto_interes).toContain("Maracuyá")
    expect(insertArg.producto_interes).toContain("Mora")
  })

  it("sends email with name in subject", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, fetchMock } = await loadPost()

    await POST(createRequest(validOrder))
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Carlos Ruiz"),
      })
    )
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(callBody.to).toEqual(["ventas@example.com"])
    expect(callBody.subject).toContain("Carlos Ruiz")
  })

  it("returns 200 and success:true on happy path", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST } = await loadPost()

    const res = await POST(createRequest(validOrder))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })

  it("rate limits after 5 requests from same IP", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST } = await loadPost()

    for (let i = 0; i < 5; i++) {
      await POST(createRequest(validOrder, "203.0.113.20"))
    }
    const res = await POST(createRequest(validOrder, "203.0.113.20"))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("60")
  })
})
