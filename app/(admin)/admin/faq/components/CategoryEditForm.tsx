"use client";

import type { CategoryEdit } from "./types";

export default function CategoryEditForm({
  cat,
  vals,
  busy,
  onCancel,
  onSave,
  onChange,
}: {
  cat: { id: string; label_es: string; label_en: string; icon: string };
  vals: CategoryEdit;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  onChange: (patch: Partial<CategoryEdit>) => void;
}) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-surface-card px-4 py-4 shadow-sm ring-1 ring-primary/15">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        Editando categoría ·{" "}
        <span className="font-mono normal-case tracking-normal text-text-faint">{cat.id}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Label (ES) *</label>
          <input
            type="text"
            autoFocus
            value={vals.label_es}
            onChange={(e) => onChange({ label_es: e.target.value })}
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Label (EN) *</label>
          <input
            type="text"
            value={vals.label_en}
            onChange={(e) => onChange({ label_en: e.target.value })}
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Icono</label>
          <input
            type="text"
            value={vals.icon}
            onChange={(e) => onChange({ icon: e.target.value })}
            maxLength={4}
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !vals.label_es.trim() || !vals.label_en.trim()}
          onClick={onSave}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
