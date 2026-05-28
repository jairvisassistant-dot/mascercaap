"use client";

import { useReducer, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Category = { key: string; label: string; description: string; display_order: number };
type Mode = "view" | "edit" | "confirm-delete";

type State = {
  cats: Category[];
  moving: string | null;
  rowMode: Record<string, Mode>;
  editValues: Record<string, { label: string; description: string }>;
  busy: string | null;
  error: string;
};

type Action =
  | { type: "startEdit"; cat: Category }
  | { type: "setEditField"; key: string; field: "label" | "description"; value: string }
  | { type: "cancelRow"; key: string }
  | { type: "setConfirmDelete"; key: string }
  | { type: "moveStart"; key: string; optimistic: Category[] }
  | { type: "moveDone" }
  | { type: "moveError"; cats: Category[]; error: string }
  | { type: "busyStart"; key: string }
  | { type: "busyDone" }
  | { type: "setError"; error: string }
  | { type: "catUpdated"; key: string; label: string; description: string }
  | { type: "catRemoved"; key: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "startEdit":
      return {
        ...state,
        editValues: { ...state.editValues, [action.cat.key]: { label: action.cat.label, description: action.cat.description } },
        rowMode: { ...state.rowMode, [action.cat.key]: "edit" },
        error: "",
      };
    case "setEditField": {
      const prev = state.editValues[action.key] ?? { label: "", description: "" };
      return { ...state, editValues: { ...state.editValues, [action.key]: { ...prev, [action.field]: action.value } } };
    }
    case "cancelRow":
      return { ...state, rowMode: { ...state.rowMode, [action.key]: "view" } };
    case "setConfirmDelete":
      return { ...state, rowMode: { ...state.rowMode, [action.key]: "confirm-delete" } };
    case "moveStart":
      return { ...state, moving: action.key, cats: action.optimistic, error: "" };
    case "moveDone":
      return { ...state, moving: null };
    case "moveError":
      return { ...state, moving: null, cats: action.cats, error: action.error };
    case "busyStart":
      return { ...state, busy: action.key, error: "" };
    case "busyDone":
      return { ...state, busy: null };
    case "setError":
      return { ...state, error: action.error };
    case "catUpdated": {
      return {
        ...state,
        cats: state.cats.map((c) =>
          c.key === action.key ? { ...c, label: action.label, description: action.description } : c,
        ),
        rowMode: { ...state.rowMode, [action.key]: "view" },
      };
    }
    case "catRemoved":
      return { ...state, cats: state.cats.filter((c) => c.key !== action.key) };
    default:
      return state;
  }
}

export default function CategoriasList({ initial }: { initial: Category[] }) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    // Intentional: mutable local copy of server data; router.refresh() remounts with fresh `initial`.
    cats: initial,
    moving: null,
    rowMode: {},
    editValues: {},
    busy: null,
    error: "",
  });
  const { cats, moving, rowMode, editValues, busy, error } = state;
  const [, startTransition] = useTransition();

  const getMode = (key: string): Mode => rowMode[key] ?? "view";

  async function move(key: string, direction: "up" | "down") {
    const idx = cats.findIndex((c) => c.key === key);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) return;

    const optimistic = [...cats];
    [optimistic[idx], optimistic[swapIdx]] = [optimistic[swapIdx], optimistic[idx]];
    dispatch({ type: "moveStart", key, optimistic });

    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "moveError", cats: initial, error: data.error ?? "Error al reordenar" });
    } else {
      dispatch({ type: "moveDone" });
      startTransition(() => refresh());
    }
  }

  async function saveEdit(key: string) {
    const vals = editValues[key];
    if (!vals?.label.trim()) return;
    dispatch({ type: "busyStart", key });

    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label: vals.label.trim(), description: vals.description.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      dispatch({ type: "setError", error: data.error ?? "Error al guardar" });
    } else {
      dispatch({ type: "catUpdated", key, label: vals.label.trim(), description: vals.description.trim() });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  async function confirmDelete(key: string) {
    dispatch({ type: "busyStart", key });

    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();

    if (!res.ok) {
      dispatch({ type: "setError", error: data.error ?? "Error al eliminar" });
      dispatch({ type: "cancelRow", key });
    } else {
      dispatch({ type: "catRemoved", key });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  const anyBusy = busy !== null || moving !== null;

  return (
    <div className="w-full max-w-2xl space-y-3">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {cats.map((cat, idx) => {
        const mode = getMode(cat.key);
        const isBusy = busy === cat.key || moving === cat.key;

        if (mode === "edit") {
          const vals = editValues[cat.key] ?? { label: cat.label, description: cat.description };
          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-primary/40 bg-surface-card p-4 shadow-sm ring-1 ring-primary/15"
            >
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Editando · <span className="font-mono normal-case tracking-normal text-text-faint">{cat.key}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${cat.key}-nombre`} className="mb-1 block text-xs font-semibold text-text-sub">Nombre *</label>
                  <input
                    id={`${cat.key}-nombre`}
                    type="text"
                    value={vals.label}
                    onChange={(e) => dispatch({ type: "setEditField", key: cat.key, field: "label", value: e.target.value })}
                    className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor={`${cat.key}-descripcion`} className="mb-1 block text-xs font-semibold text-text-sub">Descripción</label>
                  <textarea
                    id={`${cat.key}-descripcion`}
                    value={vals.description}
                    onChange={(e) => dispatch({ type: "setEditField", key: cat.key, field: "description", value: e.target.value })}
                    rows={2}
                    maxLength={200}
                    className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBusy || !vals.label.trim()}
                  onClick={() => saveEdit(cat.key)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => dispatch({ type: "cancelRow", key: cat.key })}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        }

        if (mode === "confirm-delete") {
          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm"
            >
              <p className="mb-1 text-sm font-semibold text-red-800">
                ¿Eliminar <span className="font-bold">{cat.label}</span>?
              </p>
              <p className="mb-3 text-xs text-red-600">
                Esta acción no se puede deshacer. Si la categoría tiene líneas asociadas, no podrá eliminarse.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => confirmDelete(cat.key)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => dispatch({ type: "cancelRow", key: cat.key })}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={cat.key}
            className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="w-6 shrink-0 text-center text-xs font-bold text-text-faint">
              {idx + 1}
            </span>

            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                disabled={idx === 0 || anyBusy}
                onClick={() => move(cat.key, "up")}
                className="flex size-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
                title="Subir"
                aria-label={`Subir categoría ${cat.label}`}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                disabled={idx === cats.length - 1 || anyBusy}
                onClick={() => move(cat.key, "down")}
                className="flex size-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
                title="Bajar"
                aria-label={`Bajar categoría ${cat.label}`}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-text-main">{cat.label}</p>
              <p className="font-mono text-xs text-text-faint">{cat.key}</p>
              {cat.description && (
                <p className="mt-0.5 truncate text-xs text-text-muted">{cat.description}</p>
              )}
            </div>

            {moving === cat.key && (
              <span className="text-xs text-text-faint">...</span>
            )}

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => dispatch({ type: "startEdit", cat })}
                className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                title="Editar"
                aria-label={`Editar categoría ${cat.label}`}
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => dispatch({ type: "setConfirmDelete", key: cat.key })}
                className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                title="Eliminar"
                aria-label={`Eliminar categoría ${cat.label}`}
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {cats.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay categorías creadas aún.{" "}
          <Link href="/admin/categorias/nueva" className="font-semibold text-primary underline">
            Crear la primera
          </Link>
        </p>
      )}
    </div>
  );
}
