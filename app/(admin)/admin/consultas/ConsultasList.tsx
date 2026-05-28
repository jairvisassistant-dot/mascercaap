"use client";

import { useReducer, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeadRow } from "@/types";
import ConsultaFilters from "./ConsultaFilters";
import ConsultaCard from "./ConsultaCard";

// ── Reducer ──────────────────────────────────────────────────────────────────

type State = {
  leads: LeadRow[];
  filters: Record<string, string>;
  expandedId: string | null;
  editNotas: Record<string, string>;
  busy: string | null;
  error: string;
};

type Action =
  | { type: "setFilter"; key: string; value: string }
  | { type: "clearFilters" }
  | { type: "toggleExpand"; id: string }
  | { type: "setEditNota"; id: string; value: string }
  | { type: "busyStart"; key: string }
  | { type: "busyDone" }
  | { type: "setError"; error: string }
  | { type: "setLeads"; leads: LeadRow[] }
  | { type: "clearEditNota"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setFilter":
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case "clearFilters":
      return { ...state, filters: {} };
    case "toggleExpand":
      return { ...state, expandedId: state.expandedId === action.id ? null : action.id };
    case "setEditNota":
      return { ...state, editNotas: { ...state.editNotas, [action.id]: action.value } };
    case "busyStart":
      return { ...state, busy: action.key, error: "" };
    case "busyDone":
      return { ...state, busy: null };
    case "setError":
      return { ...state, error: action.error };
    case "setLeads":
      return { ...state, leads: action.leads };
    case "clearEditNota": {
      const next = { ...state.editNotas };
      delete next[action.id];
      return { ...state, editNotas: next };
    }
    default:
      return state;
  }
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ConsultasList({ initial }: { initial: LeadRow[] }) {
  const { refresh } = useRouter();
  // Intentional: mutable local copy of server data. Mutations are applied optimistically;
  // router.refresh() remounts with a fresh `initial` from the server component.
  const [state, dispatch] = useReducer(reducer, {
    leads: initial,
    filters: {},
    expandedId: null,
    editNotas: {},
    busy: null,
    error: "",
  });
  const { leads, filters, expandedId, editNotas, busy, error } = state;
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
    dispatch({ type: "busyStart", key: id });
    dispatch({ type: "setLeads", leads: leads.map((l) => l.id === id ? { ...l, estado_seguimiento: estado } : l) });

    const res = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado_seguimiento: estado }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al actualizar estado" });
      dispatch({ type: "setLeads", leads: initial });
    } else {
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  async function saveNotas(id: string) {
    const notas = editNotas[id]?.trim() ?? "";
    dispatch({ type: "busyStart", key: `notas-${id}` });
    dispatch({ type: "setLeads", leads: leads.map((l) => l.id === id ? { ...l, notas } : l) });

    const res = await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notas }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al guardar notas" });
      dispatch({ type: "setLeads", leads: initial });
    } else {
      dispatch({ type: "clearEditNota", id });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
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

      <ConsultaFilters
        leads={leads}
        filters={filters}
        activeFilters={activeFilters}
        filteredCount={filtered.length}
        totalCount={leads.length}
        onFilter={(key, value) => dispatch({ type: "setFilter", key, value })}
        onClear={() => dispatch({ type: "clearFilters" })}
      />

      {/* ── Lead cards ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((lead) => (
          <ConsultaCard
            key={lead.id}
            lead={lead}
            isExpanded={expandedId === lead.id}
            editNota={editNotas[lead.id]}
            busy={busy}
            onToggleExpand={() => dispatch({ type: "toggleExpand", id: lead.id })}
            onEditNota={(value) => dispatch({ type: "setEditNota", id: lead.id, value })}
            onSaveNotas={() => saveNotas(lead.id)}
            onUpdateEstado={(estado) => updateEstado(lead.id, estado)}
          />
        ))}

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
