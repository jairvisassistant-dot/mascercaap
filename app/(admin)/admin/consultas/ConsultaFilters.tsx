"use client";

import type { LeadRow } from "@/types";

const TIPO_LABELS_FILTER: Record<string, string> = {
  pedido: "Pedido",
  negocio: "Mayoreo",
  consulta: "Consulta",
};

const FUENTE_LABELS_FILTER: Record<string, string> = {
  chatbot_web: "Chatbot Web",
  order_assistant: "Order Assistant",
};

interface ConsultaFiltersProps {
  leads: LeadRow[];
  filters: Record<string, string>;
  activeFilters: number;
  filteredCount: number;
  totalCount: number;
  onFilter: (key: string, value: string) => void;
  onClear: () => void;
}

export default function ConsultaFilters({
  leads,
  filters,
  activeFilters,
  filteredCount,
  totalCount,
  onFilter,
  onClear,
}: ConsultaFiltersProps) {
  return (
    <>
      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tipo filter */}
        <select
          aria-label="Filtrar por tipo"
          value={filters.tipo ?? ""}
          onChange={(e) => onFilter("tipo", e.target.value)}
          className="rounded-xl border border-border-mid bg-surface-card px-3 py-2 text-xs font-semibold text-text-sub transition-colors hover:border-primary/40"
        >
          <option value="">Todos los tipos</option>
          {[...new Set(leads.map((l) => l.tipo))].map((t) => (
            <option key={t} value={t}>
              {TIPO_LABELS_FILTER[t] ?? t}
            </option>
          ))}
        </select>

        {/* Fuente filter */}
        <select
          aria-label="Filtrar por fuente"
          value={filters.fuente ?? ""}
          onChange={(e) => onFilter("fuente", e.target.value)}
          className="rounded-xl border border-border-mid bg-surface-card px-3 py-2 text-xs font-semibold text-text-sub transition-colors hover:border-primary/40"
        >
          <option value="">Todas las fuentes</option>
          {[...new Set(leads.map((l) => l.fuente))].map((f) => (
            <option key={f} value={f}>
              {FUENTE_LABELS_FILTER[f] ?? f}
            </option>
          ))}
        </select>

        {/* Estado filter */}
        <select
          aria-label="Filtrar por estado"
          value={filters.estado ?? ""}
          onChange={(e) => onFilter("estado", e.target.value)}
          className="rounded-xl border border-border-mid bg-surface-card px-3 py-2 text-xs font-semibold text-text-sub transition-colors hover:border-primary/40"
        >
          <option value="">Todos los estados</option>
          {[...new Set(leads.map((l) => l.estado_seguimiento))].flatMap((e) =>
            e
              ? [
                  <option key={e} value={e}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </option>,
                ]
              : []
          )}
        </select>

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-text-muted">
        {filteredCount} consulta{filteredCount !== 1 ? "s" : ""}
        {activeFilters > 0 && (
          <span className="text-text-faint"> ({totalCount} total)</span>
        )}
      </p>
    </>
  );
}
