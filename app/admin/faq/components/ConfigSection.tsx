"use client";

import type { ConfigForm } from "./types";
import type { FAQConfigRow } from "@/types";

export default function ConfigSection({
  config,
  editConfig,
  configForm,
  busy,
  onStartEdit,
  onCancel,
  onChange,
  onSave,
}: {
  config: FAQConfigRow | null;
  editConfig: boolean;
  configForm: ConfigForm;
  busy: string | null;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (f: ConfigForm) => void;
}) {
  if (editConfig) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface-card px-4 py-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-text-main">Mensaje de fallback</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-sub">Fallback (ES)</label>
            <textarea
              value={configForm.fallback_es}
              onChange={(e) => onChange({ ...configForm, fallback_es: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-sub">Fallback (EN)</label>
            <textarea
              value={configForm.fallback_en}
              onChange={(e) => onChange({ ...configForm, fallback_en: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy === "config"}
              onClick={onSave}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "config" ? "Guardando…" : "Guardar configuración"}
            </button>
            <button
              type="button"
              disabled={busy === "config"}
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-surface-card px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-text-main">Mensaje de fallback</h2>
          <p className="text-xs text-text-muted">
            Texto que se muestra cuando el chatbot no encuentra respuesta.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartEdit}
          className="shrink-0 rounded-xl border border-border-mid px-4 py-2 text-sm font-semibold text-text-sub transition-colors hover:border-primary/40 hover:text-primary-dark"
        >
          Editar
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-warm px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-faint">ES</p>
          <p className="text-sm text-text-sub">{config?.fallback_es ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-surface-warm px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-faint">EN</p>
          <p className="text-sm text-text-sub">{config?.fallback_en ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
