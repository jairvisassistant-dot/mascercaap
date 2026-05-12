import { NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { orderSchema } from "@/lib/schemas/order"
import { buildOrderEmailHtml, buildPriceResolver, type PriceEntry } from "@/lib/order-assistant"
import { supabase } from "@/lib/supabase"

const requestLog = new Map<string, number[]>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= RATE_LIMIT_MAX) return false

  timestamps.push(now)
  requestLog.set(ip, timestamps)

  if (requestLog.size > 500) {
    for (const [key, times] of requestLog.entries()) {
      if (times.every((t) => t <= windowStart)) requestLog.delete(key)
    }
  }

  return true
}

function sanitizeSubject(str: string): string {
  return str.replace(/[\r\n\x00-\x1f\x7f]+/g, " ").slice(0, 80).trim()
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  try {
    const body = await request.json()
    const data = orderSchema.parse(body)

    // Guardar lead en Supabase para marketing (ignorar error — no bloquear el pedido)
    if (supabase) {
      const productoInteres = data.items
        .map((item) => `${item.fruit} ${item.presentation} ×${item.quantity}`)
        .join(", ")

      const { error: dbError } = await supabase.from("leads").insert({
        nombre:           data.nombre,
        email:            data.email ?? null,
        tipo:             "pedido",
        producto_interes: productoInteres,
        fuente:           "order_assistant",
        whatsapp_number:  data.whatsapp_number ?? null,
        consent_accepted: data.consentAccepted,
        consented_at:     new Date().toISOString(),
      })
      if (dbError) {
        console.error("Supabase insert error (order):", dbError.message)
      }
    }

    // Resolve live prices from Supabase
    let resolvePrice = buildPriceResolver([])
    if (supabase) {
      const { data: dbProducts } = await supabase
        .from("products")
        .select("line, name, presentation, price")
        .not("price", "is", null)
      if (dbProducts?.length) {
        resolvePrice = buildPriceResolver(dbProducts as PriceEntry[])
      }
    }

    const apiKey    = process.env.RESEND_API_KEY
    const toEmail   = process.env.RESEND_TO_EMAIL
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

    if (!apiKey) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("⚠️  RESEND_API_KEY no configurada. Email omitido (dev mode).")
        return NextResponse.json({ success: true, dev: true }, { status: 200 })
      }
      return NextResponse.json(
        { success: false, error: "Servicio de email temporalmente no disponible" },
        { status: 503 }
      )
    }

    if (!toEmail) {
      console.error("❌  RESEND_TO_EMAIL no configurada.")
      return NextResponse.json({ success: false, error: "Configuración incompleta" }, { status: 500 })
    }

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from:    `Más Cerca AP <${fromEmail}>`,
      to:      [toEmail],
      replyTo: data.email ?? undefined,
      subject: `🛒 Nuevo pedido — ${sanitizeSubject(data.nombre)} — ${data.items.length} producto${data.items.length !== 1 ? "s" : ""}`,
      html:    buildOrderEmailHtml(data, resolvePrice),
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error al enviar pedido:", error instanceof Error ? error.message.slice(0, 100) : "unknown")
    return NextResponse.json(
      { success: false, error: "Error al enviar el pedido" },
      { status: 500 }
    )
  }
}
