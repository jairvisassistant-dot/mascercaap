/**
 * Shared utility to build a human-readable handoff summary from FAQ conversation context.
 * Isomorphic — safe for both client and server.
 */

export type HandoffMessage = { id: string; role: "bot" | "user"; text: string };

export type HandoffLeadInfo = {
  nombre: string;
  email?: string | null;
  tipo: string;
  producto_interes?: string | null;
};

const TIPO_LABELS: Record<string, string> = {
  pedido: "Pedido",
  negocio: "Mayoreo/Distribución",
  consulta: "Consulta General",
};

/**
 * Builds a concise, scannable handoff summary for internal use.
 *
 * Format:
 *   Nombre · Tipo · Producto · N consultas · "Última pregunta"
 *
 * Used both for DB storage (resumen_handoff column) and as input for
 * email notifications.
 */
export function buildHandoffSummary(messages: HandoffMessage[], lead: HandoffLeadInfo): string {
  const tipo = TIPO_LABELS[lead.tipo] ?? lead.tipo;
  const userMsgs = messages.filter((m) => m.role === "user" && m.id !== "welcome");
  const count = userMsgs.length;
  const lastQ = count > 0 ? userMsgs[count - 1].text : null;

  let summary = `${lead.nombre} · ${tipo}`;
  if (lead.producto_interes) summary += ` · ${lead.producto_interes}`;
  if (lastQ) {
    const truncated = lastQ.length > 100 ? lastQ.slice(0, 100) + "…" : lastQ;
    summary += ` · ${count} consulta${count !== 1 ? "s" : ""} · "${truncated}"`;
  }
  return summary;
}
