import { afterEach, describe, expect, it, vi } from "vitest"

const validOrder = {
  nombre: "Carlos Ruiz",
  email: "carlos@example.com",
  whatsapp_number: null,
  consentAccepted: true,
  profile: "cafeteria",
  productType: "Pulpas",
  fruit: "Maracuyá",
  presentation: "1000g",
  quantity: 10,
  zone: "bogota",
  urgency: "manana",
} as const

function createRequest(body: unknown, ip = "198.51.100.10") {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
}

async function loadPost(
  resendSend = vi.fn().mockResolvedValue({ id: "email_123" }),
  supabaseInsert = vi.fn().mockResolvedValue({ error: null })
) {
  const Resend = vi.fn(function Resend(this: { emails: { send: typeof resendSend } }) {
    this.emails = { send: resendSend }
  })

  const mockSupabase = {
    from: vi.fn(() => ({ insert: supabaseInsert })),
  }

  vi.resetModules()
  vi.doMock("resend", () => ({ Resend }))
  vi.doMock("@/lib/supabase", () => ({ supabase: mockSupabase }))

  const route = await import("./route")
  return { POST: route.POST, Resend, resendSend, supabaseInsert, mockSupabase }
}

describe("POST /api/orders", () => {
  afterEach(() => {
    vi.doUnmock("resend")
    vi.doUnmock("@/lib/supabase")
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns 400 for invalid payload", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, Resend } = await loadPost()

    const res = await POST(createRequest({ ...validOrder, quantity: 0 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(Resend).not.toHaveBeenCalled()
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

  it("returns dev success without Resend when key missing outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("RESEND_API_KEY", "")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, Resend } = await loadPost()

    const res = await POST(createRequest(validOrder))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true, dev: true })
    expect(Resend).not.toHaveBeenCalled()
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

  it("sends email with fruit and name in subject", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key")
    vi.stubEnv("RESEND_TO_EMAIL", "ventas@example.com")
    const { POST, resendSend } = await loadPost()

    await POST(createRequest(validOrder))
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["ventas@example.com"],
        subject: expect.stringContaining("Carlos Ruiz"),
      })
    )
    const call = resendSend.mock.calls[0]?.[0]
    expect(call.subject).toContain("Maracuyá")
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
      await POST(createRequest(validOrder, "203.0.113.10"))
    }
    const res = await POST(createRequest(validOrder, "203.0.113.10"))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("60")
  })
})
