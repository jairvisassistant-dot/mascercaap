import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { contactSchema, type ContactFormData } from "@/lib/schemas/contact";

// Rate Limiting — sliding window, in-memory
// 5 requests per IP per 60s. Resets on cold start — acceptable for a contact
// form. Upgrade to @upstash/ratelimit + Vercel KV for cross-instance persistence
// if spam volume justifies the operational cost.
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) return false;

  timestamps.push(now);
  requestLog.set(ip, timestamps);

  // Prevent unbounded growth: purge fully-expired entries when map exceeds 500 keys
  if (requestLog.size > 500) {
    for (const [key, times] of requestLog.entries()) {
      if (times.every((t) => t <= windowStart)) requestLog.delete(key);
    }
  }

  return true;
}

const tipoLabel: Record<string, string> = {
  pedido: "Realizar un pedido",
  distribucion: "Distribuidor / Mayoreo",
  otro: "Otro",
};

/** Escapa caracteres HTML especiales para prevenir inyección en el email (SEC-06) */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeSubject(str: string): string {
  return str.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").slice(0, 80).trim();
}

function buildEmailHtml(data: ContactFormData): string {
  // Escapar todos los datos de usuario antes de interpolar en HTML
  const nombre   = escapeHtml(data.nombre);
  const empresa  = data.empresa ? escapeHtml(data.empresa) : null;
  const email    = escapeHtml(data.email);
  const telefono = escapeHtml(data.telefono);
  const mensaje  = escapeHtml(data.mensaje);
  const tipo     = escapeHtml(tipoLabel[data.tipo] ?? data.tipo);

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
                Nuevo mensaje desde el formulario de contacto
              </p>
            </td>
          </tr>

          <!-- Badge tipo -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <span style="display:inline-block;background:#fdf2e2;color:#c97016;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid #f1c78f;">
                ${tipo}
              </span>
            </td>
          </tr>

          <!-- Datos -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Nombre</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${nombre}</p>
                  </td>
                </tr>

                ${empresa ? `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Empresa / Negocio</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${empresa}</p>
                  </td>
                </tr>` : ""}

                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                    <p style="margin:4px 0 0;font-size:16px;color:#111827;">
                      <a href="mailto:${email}" style="color:#3f8f46;text-decoration:none;">${email}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</p>
                    <p style="margin:4px 0 0;font-size:16px;color:#111827;">
                      <a href="tel:${telefono}" style="color:#3f8f46;text-decoration:none;">${telefono}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Mensaje</p>
                    <p style="margin:8px 0 0;font-size:15px;color:#374151;line-height:1.6;background:#f9fafb;padding:16px;border-radius:8px;border-left:3px solid #3f8f46;">
                      ${mensaje}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Este mensaje fue enviado desde el formulario de contacto de
                <strong style="color:#3f8f46;">mascercap.com</strong>
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

export async function POST(request: Request) {
  // Rate limiting — block before any processing
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    const apiKey   = process.env.RESEND_API_KEY;
    const toEmail  = process.env.RESEND_TO_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    if (!apiKey) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("⚠️  RESEND_API_KEY no configurada. Email omitido (dev mode).");
        return NextResponse.json({ success: true, dev: true }, { status: 200 });
      }
      return NextResponse.json(
        { success: false, error: "Servicio de email temporalmente no disponible" },
        { status: 503 }
      );
    }

    if (!toEmail) {
      console.error("❌  RESEND_TO_EMAIL no configurada.");
      return NextResponse.json({ success: false, error: "Configuración incompleta" }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: `Más Cerca AP <${fromEmail}>`,
      to: [toEmail],
      replyTo: data.email,
      subject: `📩 Nuevo mensaje: ${tipoLabel[data.tipo]} — ${sanitizeSubject(data.nombre)}`,
      html: buildEmailHtml(data),
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error al enviar email:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { success: false, error: "Error al enviar el mensaje" },
      { status: 500 }
    );
  }
}
