"use client";

import { useReducer, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateCategoryKey } from "@/lib/id-generators";

type State = {
  label: string;
  description: string;
  generatedKey: string;
  loadingKey: boolean;
  saving: boolean;
  error: string;
};

type Action =
  | { type: "setLabel"; value: string }
  | { type: "setDescription"; value: string }
  | { type: "keyLoaded"; key: string }
  | { type: "keyError" }
  | { type: "savingStart" }
  | { type: "savingDone"; error?: string };

const initialState: State = {
  label: "",
  description: "",
  generatedKey: "",
  loadingKey: true,
  saving: false,
  error: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setLabel":       return { ...state, label: action.value };
    case "setDescription": return { ...state, description: action.value };
    case "keyLoaded":      return { ...state, generatedKey: action.key, loadingKey: false };
    case "keyError":       return { ...state, generatedKey: generateCategoryKey(0), loadingKey: false };
    case "savingStart":    return { ...state, saving: true, error: "" };
    case "savingDone":     return { ...state, saving: false, error: action.error ?? "" };
    default:               return state;
  }
}

export default function NuevaCategoriaForm() {
  const { push, refresh } = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { label, description, generatedKey, loadingKey, saving, error } = state;

  useEffect(() => {
    const controller = new AbortController();
    const loadKey = async () => {
      try {
        const r = await fetch("/api/admin/categories", { signal: controller.signal });
        const data: unknown[] = await r.json();
        const count = Array.isArray(data) ? data.length : 0;
        dispatch({ type: "keyLoaded", key: generateCategoryKey(count) });
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        dispatch({ type: "keyError" });
      }
    };
    void loadKey();
    return () => controller.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!generatedKey) return;
    dispatch({ type: "savingStart" });
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: generatedKey, label, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando categoría");
      push("/admin/categorias");
      refresh();
    } catch (e) {
      dispatch({ type: "savingDone", error: e instanceof Error ? e.message : "Error creando categoría" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl space-y-8 rounded-3xl border border-border-soft bg-surface-card p-7 shadow-[0_24px_70px_-40px_rgba(47,111,54,0.5)] lg:p-8"
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
          Información de la categoría
        </h2>
        <div className="space-y-4">
          <Field label="Nombre *" htmlFor="categoria-nombre">
            <input
              id="categoria-nombre"
              type="text"
              value={label}
              onChange={(e) => dispatch({ type: "setLabel", value: e.target.value })}
              required
              placeholder="ej: Bebidas Exóticas"
              className={inputCls}
            />
          </Field>

          <IdChip
            label="Identificador"
            value={loadingKey ? "" : generatedKey}
            loading={loadingKey}
          />

          <Field label="Descripción" htmlFor="categoria-descripcion">
            <textarea
              id="categoria-descripcion"
              value={description}
              onChange={(e) => dispatch({ type: "setDescription", value: e.target.value })}
              maxLength={200}
              rows={3}
              placeholder="Descripción breve de esta categoría..."
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-xs text-text-muted">{description.length}/200</p>
          </Field>
        </div>
      </section>

      <div className="rounded-2xl border border-primary/15 bg-[#f7ffe6]/60 px-4 py-3 text-sm text-text-sub">
        Después de crear la categoría, podrás asignarle líneas de producto al crear o editar cada línea.
      </div>

      <div className="flex items-center gap-4 border-t border-border-soft pt-4">
        <button
          type="submit"
          disabled={saving || loadingKey || !label}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          {saving ? "Creando..." : "Crear categoría"}
        </button>
        <button
          type="button"
          onClick={() => push("/admin/categorias")}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-sm text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-text-sub">{label}</label>
      {children}
    </div>
  );
}

function IdChip({
  label,
  value,
  loading,
  adjusted,
}: {
  label: string;
  value: string;
  loading?: boolean;
  adjusted?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-text-sub">{label}</p>
      <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-warm px-4 py-3">
        <span className="font-mono text-sm text-text-sub">
          {loading ? "Generando…" : value || "—"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {adjusted && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Ajustado
            </span>
          )}
          <span className="rounded-md bg-border-mid/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Auto
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-text-muted">Generado automáticamente. No es editable.</p>
    </div>
  );
}
