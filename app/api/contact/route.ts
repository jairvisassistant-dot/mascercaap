import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const contactSchema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().optional(),
  email: z.string().email(),
  telefono: z.string().min(7),
  tipo: z.enum(["pedido", "distribucion", "otro"]),
  mensaje: z.string().min(10),
});

const tipoLabel: Record<string, string> = {
  pedido: "Realizar un pedido",
  distribucion: "Distribuidor / Mayoreo",
  otro: "Otro",
};

function buildEmailHtml(data: z.infer<typeof contactSchema>): string {
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
            <td style="background:linear-gradient(135deg,#4CAF50,#2E7D32);padding:32px 40px;text-align:center;">
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
              <span style="display:inline-block;background:#FFF3E0;color:#E65100;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid #FFCC80;">
                ${tipoLabel[data.tipo] ?? data.tipo}
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
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${data.nombre}</p>
                  </td>
                </tr>

                ${data.empresa ? `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Empresa / Negocio</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#111827;">${data.empresa}</p>
                  </td>
                </tr>` : ""}

                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
                    <p style="margin:4px 0 0;font-size:16px;color:#111827;">
                      <a href="mailto:${data.email}" style="color:#4CAF50;text-decoration:none;">${data.email}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Teléfono</p>
                    <p style="margin:4px 0 0;font-size:16px;color:#111827;">
                      <a href="tel:${data.telefono}" style="color:#4CAF50;text-decoration:none;">${data.telefono}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Mensaje</p>
                    <p style="margin:8px 0 0;font-size:15px;color:#374151;line-height:1.6;background:#f9fafb;padding:16px;border-radius:8px;border-left:3px solid #4CAF50;">
                      ${data.mensaje}
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
                <strong style="color:#4CAF50;">mascercap.com</strong>
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
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.RESEND_TO_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    if (!apiKey || apiKey === "re_REEMPLAZA_CON_TU_CLAVE") {
      // Sin clave configurada — en dev devolvemos éxito igual para no bloquear pruebas
      console.warn("⚠️  RESEND_API_KEY no configurada. El email no fue enviado.");
      return NextResponse.json({ success: true, dev: true }, { status: 200 });
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
      subject: `📩 Nuevo mensaje: ${tipoLabel[data.tipo]} — ${data.nombre}`,
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
    console.error("Error al enviar email:", error);
    return NextResponse.json(
      { success: false, error: "Error al enviar el mensaje" },
      { status: 500 }
    );
  }
}
