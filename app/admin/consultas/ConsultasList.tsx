"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ── Tipos locales ────────────────────────────────────────────────────────────

type LeadRow = {
  id: string;
  nombre: string;
  email: string | null;
  tipo: string;
  producto_interes: string | null;
  preguntas_bot: string[];
  resumen_handoff: string | null;
  fuente: string;
  whatsapp_number: string | null;
  consent_accepted: boolean;
  created_at: string;
  estado_seguimiento: string;
  notas: string | null;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  pedido: "Pedido",
  negocio: "Mayoreo",
  consulta: "Consulta",
};

const TIPO_COLORS: Record<string, string> = {
  pedido: "bg-blue-50 text-blue-700 border-blue-200",
  negocio: "bg-purple-50 text-purple-700 border-purple-200",
  consulta: "bg-teal-50 text-teal-700 border-teal-200",
};

const FUENTE_LABELS: Record<string, string> = {
  chatbot_web: "Chatbot Web",
  order_assistant: "Order Assistant",
};

const ESTADO_OPTIONS = ["nuevo", "contactado", "convertido", "perdido"] as const;

const ESTADO_COLORS: Record<string, string> = {
  nuevo:     "bg-blue-100 text-blue-700 border-blue-200",
  contactado: "bg-amber-100 text-amber-700 border-amber-200",
  convertido: "bg-green-100 text-green-700 border-green-200",
  perdido:   "bg-gray-100 text-gray-500 border-gray-200",
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function ConsultasList({ initial }: { initial: LeadRow[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotas, setEditNotas] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // ── Derived data ─────────────────────────────────────────────────────────

  const filtered = leads.filter((lead) => {
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        const field = key === "estado" ? "estado_seguimiento" : key;
        if (lead[field as keyof LeadRow] !== value) return false;
      }
    }
    return true;
  });

  const activeFilters = Object.values(filters).filter(Boolean).length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function updateEstado(id: string, estado: string) {
    setBusy(id);
    setError("");

    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, estado_seguimiento: estado } : l))
    );

    const res = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado_seguimiento: estado }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al actualizar estado");
      setLeads(initial);
    } else {
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  async function saveNotas(id: string) {
    const notas = editNotas[id]?.trim() ?? "";
    setBusy(`notas-${id}`);
    setError("");

    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notas } : l))
    );

    const res = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notas }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar notas");
      setLeads(initial);
    } else {
      setEditNotas((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  function clearFilters() {
    setFilters({});
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-4">
      {/* Error banner */}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tipo filter */}
        <select
          value={filters.tipo ?? ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}
          className="rounded-xl border border-border-mid bg-surface-card px-3 py-2 text-xs font-semibold text-text-sub transition-colors hover:border-primary/40"
        >
          <option value="">Todos los tipos</option>
          {[...new Set(leads.map((l) => l.tipo))].map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS[t] ?? t}
            </option>
          ))}
        </select>

        {/* Fuente filter */}
        <select
          value={filters.fuente ?? ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, fuente: e.target.value }))}
          className="rounded-xl border border-border-mid bg-surface-card px-3 py-2 text-xs font-semibold text-text-sub transition-colors hover:border-primary/40"
        >
          <option value="">Todas las fuentes</option>
          {[...new Set(leads.map((l) => l.fuente))].map((f) => (
            <option key={f} value={f}>
              {FUENTE_LABELS[f] ?? f}
            </option>
          ))}
        </select>

        {/* Estado filter */}
        <select
          value={filters.estado ?? ""}
          onChange={(e) => setFilters((prev) => ({ ...prev, estado: e.target.value }))}
          className="rounded-xl border border-border-mid bg-surface-card px-3 py-2 text-xs font-semibold text-text-sub transition-colors hover:border-primary/40"
        >
          <option value="">Todos los estados</option>
          {[...new Set(leads.map((l) => l.estado_seguimiento))].map((e) => (
            <option key={e} value={e}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </option>
          ))}
        </select>

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-text-muted">
        {filtered.length} consulta{filtered.length !== 1 ? "s" : ""}
        {activeFilters > 0 && (
          <span className="text-text-faint">
            {" "}({leads.length} total)
          </span>
        )}
      </p>

      {/* ── Lead cards ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((lead) => {
          const isExpanded = expandedId === lead.id;
          const createdAt = new Date(lead.created_at);
          const dateStr = createdAt.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={lead.id}
              className={`rounded-2xl border bg-surface-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${
                isExpanded ? "border-primary/30 ring-1 ring-primary/10" : "border-border-soft"
              }`}
            >
              {/* ── Header row ───────────────────────────────────── */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-text-main">
                      {lead.nombre}
                    </span>
                    {lead.email && (
                      <span className="hidden truncate text-sm text-text-muted sm:inline">
                        · {lead.email}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span>{dateStr}</span>
                    <span>{FUENTE_LABELS[lead.fuente] ?? lead.fuente}</span>
                    {lead.producto_interes && (
                      <span className="truncate">
                        Producto: <span className="font-medium text-text-sub">{lead.producto_interes}</span>
                      </span>
                    )}
                    {lead.whatsapp_number && (
                      <span className="truncate">WA: {lead.whatsapp_number}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Tipo badge */}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      TIPO_COLORS[lead.tipo] ?? "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {TIPO_LABELS[lead.tipo] ?? lead.tipo}
                  </span>

                  {/* Estado badge */}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      ESTADO_COLORS[lead.estado_seguimiento] ?? ""
                    }`}
                  >
                    {lead.estado_seguimiento}
                  </span>
                </div>
              </div>

              {/* ── Preguntas preview ────────────────────────────── */}
              {lead.preguntas_bot.length > 0 && !isExpanded && (
                <p className="mt-2 line-clamp-1 text-xs text-text-muted">
                  {lead.preguntas_bot[lead.preguntas_bot.length - 1]}
                </p>
              )}

              {/* ── Expand / collapse ────────────────────────────── */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                className="mt-2 text-[11px] font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary-dark"
              >
                {isExpanded ? "Contraer" : "Ver detalle"}
              </button>

              {/* ── Expanded area ────────────────────────────────── */}
              {isExpanded && (
                <div className="mt-3 space-y-4 border-t border-border-soft pt-3">
                  {/* Preguntas del bot */}
                  {lead.preguntas_bot.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-text-faint">
                        Preguntas realizadas
                      </p>
                      <ul className="space-y-1">
                        {lead.preguntas_bot.map((q, i) => (
                          <li
                            key={i}
                            className="rounded-lg bg-surface-warm px-3 py-1.5 text-sm text-text-sub"
                          >
                            <span className="mr-1.5 text-[10px] font-bold text-text-faint">{i + 1}.</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Resumen de handoff */}
                  {lead.resumen_handoff && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-text-faint">
                        Resumen del handoff
                      </p>
                      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                        {lead.resumen_handoff}
                      </p>
                    </div>
                  )}

                  {/* Email si no se mostró arriba */}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="font-semibold text-text-sub">Email:</span>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-primary underline hover:text-primary-dark"
                      >
                        {lead.email}
                      </a>
                    </div>
                  )}

                  {/* Consentimiento */}
                  {lead.consent_accepted && (
                    <p className="text-[10px] text-text-faint">
                      ✓ Consentimiento aceptado
                    </p>
                  )}

                  {/* ── Estado de seguimiento ───────────────────── */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-text-sub">
                      Estado de seguimiento
                    </label>
                    <select
                      value={lead.estado_seguimiento}
                      onChange={(e) => updateEstado(lead.id, e.target.value)}
                      disabled={busy === lead.id}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        ESTADO_COLORS[lead.estado_seguimiento] ?? ""
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {ESTADO_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                    {busy === lead.id && (
                      <span className="text-xs text-text-faint">Guardando…</span>
                    )}
                  </div>

                  {/* ── Notas ────────────────────────────────────── */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-text-sub">
                      Notas internas
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        defaultValue={lead.notas ?? ""}
                        onChange={(e) =>
                          setEditNotas((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        rows={2}
                        maxLength={2000}
                        placeholder="Agregá una nota interna sobre este lead…"
                        className="min-h-0 w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        disabled={busy === `notas-${lead.id}` || !((editNotas[lead.id]?.trim() ?? "") !== (lead.notas?.trim() ?? ""))}
                        onClick={() => saveNotas(lead.id)}
                        className="self-end rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === `notas-${lead.id}` ? "…" : "Guardar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-text-muted">
            {leads.length === 0
              ? "No hay consultas todavía. Cuando alguien envíe un lead desde el chatbot o asistente de pedidos, aparecerá acá."
              : "No hay consultas con los filtros seleccionados."}
          </p>
        )}
      </div>
    </div>
  );
}
