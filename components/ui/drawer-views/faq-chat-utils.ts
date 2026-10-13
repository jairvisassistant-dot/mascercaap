import { buildWhatsAppLinks, buildWhatsAppMessage } from "@/lib/whatsapp";
import { SITE_CONFIG } from "@/lib/config";

/**
 * Pure helpers shared by the FAQ assistant view and its lead-capture flow.
 *
 * Kept free of React so the view component and the lead-flow hook stay thin
 * and the message/intent rules can be reasoned about (and reused) on their own.
 */

export type FaqChatMessage = { id: string; role: "bot" | "user"; text: string };

export type FaqLeadTipo = "pedido" | "negocio" | "consulta";

export type FaqLeadData = { nombre: string; email: string; tipo: FaqLeadTipo | "" };

/** Detects explicit "I want a human advisor" intent in free-text queries. */
export function isAdvisorIntent(query: string): boolean {
  const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const patterns = [
    /asesor/, /hablar con/, /hablar a /, /persona real/, /humano/, /agente/,
    /whatsapp/, /llamar/, /contactar/, /necesito ayuda/, /ayuda directa/,
    /talk to/, /speak with/, /human agent/, /advisor/,
  ];
  return patterns.some((p) => p.test(q));
}

/** Builds the WhatsApp app/web links for the configured site number. */
export function buildFaqWhatsAppLinks(message: string) {
  return buildWhatsAppLinks(SITE_CONFIG.whatsappNumber, message);
}

/**
 * Composes the WhatsApp handoff message: optional lead details, the product
 * context when present, and the visitor/bot conversation (truncated).
 */
export function buildFaqWhatsAppConversationText(
  messages: FaqChatMessage[],
  lead?: Partial<FaqLeadData>,
  product?: string | null
): string {
  const lines: string[] = ["Hola! Vine del chatbot de su página web."];

  if (lead?.nombre) lines.push(`\nNombre: *${lead.nombre}*`);
  if (lead?.email) lines.push(`\nEmail: ${lead.email}`);
  if (lead?.tipo) {
    const label: Record<FaqLeadTipo, string> = {
      pedido: "Quiero hacer un pedido",
      negocio: "Tengo un negocio (mayoreo / distribución)",
      consulta: "Consulta general",
    };
    lines.push(`\nMotivo: ${label[lead.tipo as FaqLeadTipo] ?? lead.tipo}`);
  }
  if (product) lines.push(`\nProducto de interés: *${product}*`);

  const conversation = messages
    .flatMap((msg) => {
      if (msg.id === "welcome") return [];
      return [msg.role === "user"
        ? `Yo: "${msg.text}"`
        : `Bot: "${msg.text.length > 120 ? msg.text.slice(0, 120) + "…" : msg.text}"`];
    })
    .join("\n");

  if (conversation) lines.push(`\nConversación:\n${conversation}`);
  lines.push("\n¿Me pueden ayudar?");
  return buildWhatsAppMessage(lines);
}
