import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createLeadSchema, ES_LEAD_MESSAGES, EN_LEAD_MESSAGES } from "@/lib/schemas/lead";
import { supabase } from "@/lib/supabase";
import { SITE_CONFIG } from "@/lib/config";
import { escapeHtml, sanitizeSubject } from "@/lib/sanitize";

// Rate limiting — sliding window, in-memory
// 10 requests per IP per 60s. Resets on cold start — acceptable for a chatbot
// lead capture flow. Upgrade to @upstash/ratelimit + Vercel KV for cross-instance
// persistence if spam volume justifies the operational cost.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) return false;

  timestamps.push(now);
  requestLog.set(ip, timestamps);

  if (requestLog.size > 500) {
    for (const [key, times] of requestLog.entries()) {
      if (times.every((t) => t <= windowStart)) requestLog.delete(key);
    }
  }

  return true;
}

// ── Email notification helpers ─────────────────────────────────────────────

const TIPO_EMAIL_LABELS: Record<string, string> = {
  pedido: "Pedido",
  negocio: "Mayoreo / Distribución",
  consulta: "Consulta General",
};

/**
 * Builds a scannable HTML email for internal lead notification.
 * Follows the same visual pattern as contact/orders email templates.
 */
function buildLeadEmailHtml(data: {
  nombre: string;
  email?: string | null;
  tipo: string;
  producto_interes?: string | null;
  preguntas_bot?: string[];
  resumen_handoff?: string;
}): string {
  const nombre  = escapeHtml(data.nombre);
  const email   = data.email ? escapeHtml(data.email) : "—";
  const tipo    = escapeHtml(TIPO_EMAIL_LABELS[data.tipo] ?? data.tipo);
  const prod    = data.producto_interes ? escapeHtml(data.producto_interes) : "—";
  const resumen = data.resumen_handoff ? escapeHtml(data.resumen_handoff) : null;

  const preguntasHtml = (data.preguntas_bot?.length ?? 0) > 0
    ? data.preguntas_bot!
        .map((q, i) => `<p style="margin:4px 0;font-size:14px;color:#374151;">${i + 1}. ${escapeHtml(q)}</p>`)
        .join("")
    : '<p style="margin:4px 0;font-size:14px;color:#9ca3af;font-style:italic;">Sin consultas previas</p>';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3f8f46,#2f6f36);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🍋 MÁS CERCA AP
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                Nuevo lead desde el chatbot — listo para atender
              </p>
            </td>
          </tr>

          <!-- Badge tipo -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <span style="display:inline-block;background:#dcfce7;color:#166534;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid #86efac;">
                💬 ${tipo}
              </span>
            </td>
          </tr>

          <!-- Resumen handoff -->
          ${resumen ? `
          <tr>
            <td style="padding:16px 40px 0;">
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Resumen del handoff</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${resumen}</p>
              </div>
            </td>
          </tr>` : ""}

          <!-- Datos del lead -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Datos del lead</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Nombre</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${nombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#111827;">${email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Producto de interés</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#111827;">${prod}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conversación en el chatbot -->
          <tr>
            <td style="padding:16px 40px 24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Consultas del cliente</p>
              ${preguntasHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Lead capturado desde el chatbot —
                <strong style="color:#3f8f46;">${new URL(SITE_CONFIG.siteUrl).hostname}</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an internal email notification for a new chatbot lead.
 * Fail-safe: never throws; logs errors and returns void.
 */
async function sendLeadNotification(data: {
  nombre: string;
  email?: string | null;
  tipo: string;
  producto_interes?: string | null;
  preguntas_bot?: string[];
  resumen_handoff?: string;
}): Promise<void> {
  const apiKey   = process.env.RESEND_API_KEY;
  const toEmail  = process.env.RESEND_TO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️  RESEND_API_KEY no configurada. Notificación de lead omitida (dev mode).");
    }
    return;
  }

  if (!toEmail) {
    console.error("❌  RESEND_TO_EMAIL no configurada — notificación de lead omitida.");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from:    `Más Cerca AP <${fromEmail}>`,
      to:      [toEmail],
      replyTo: data.email ?? undefined,
      subject: `💬 Lead chatbot — ${sanitizeSubject(data.nombre)} — ${TIPO_EMAIL_LABELS[data.tipo] ?? data.tipo}`,
      html:    buildLeadEmailHtml(data),
    });
  } catch (err) {
    // Fail-safe: notification errors never bubble up to the caller
    console.error("Error al notificar lead (no crítico):", err instanceof Error ? err.message.slice(0, 120) : "unknown");
  }
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const body = await req.json();
    const referer = req.headers.get("referer") ?? "";
    const msgs = referer.includes("/en/") ? EN_LEAD_MESSAGES : ES_LEAD_MESSAGES;
    const parsed = createLeadSchema(msgs).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
    }

    const { data } = parsed;

    // ── Guardar lead en Supabase ─────────────────────────────────────────
    const { error } = await supabase.from("leads").insert({
      nombre:           data.nombre,
      email:            data.email ?? null,
      tipo:             data.tipo,
      producto_interes: data.producto_interes ?? null,
      preguntas_bot:    data.preguntas_bot ?? [],
      resumen_handoff:  data.resumen_handoff ?? null,
      fuente:           "chatbot_web",
    });

    if (error) {
      console.error("Supabase insert error:", error.message);
      return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
    }

    // ── Notificación interna (fail-safe) ──────────────────────────────────
    // Esto corre DESPUÉS del insert exitoso. Si la notificación falla, el lead
    // ya está guardado y el handoff por WhatsApp no se ve afectado.
    await sendLeadNotification(data);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error en /api/leads:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
