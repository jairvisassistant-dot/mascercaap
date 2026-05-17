"use client";

import type { NewCategory } from "./types";

export default function NewCategoryForm({
  busy,
  newCat,
  onChange,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  newCat: NewCategory;
  onChange: (c: NewCategory) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const canSubmit =
    newCat.id.trim() && newCat.label_es.trim() && newCat.label_en.trim();

  return (
    <div className="rounded-2xl border border-primary/40 bg-surface-card px-4 py-4 shadow-sm ring-1 ring-primary/15">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        Nueva categoría
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">
            ID *
          </label>
          <input
            type="text"
            autoFocus
            value={newCat.id}
            onChange={(e) => onChange({ ...newCat, id: e.target.value })}
            placeholder="ej: envios"
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-0.5 text-[10px] text-text-faint">
            Minúsculas, sin espacios, único
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">
            Label (ES) *
          </label>
          <input
            type="text"
            value={newCat.label_es}
            onChange={(e) => onChange({ ...newCat, label_es: e.target.value })}
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">
            Label (EN) *
          </label>
          <input
            type="text"
            value={newCat.label_en}
            onChange={(e) => onChange({ ...newCat, label_en: e.target.value })}
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">
            Icono
          </label>
          <input
            type="text"
            value={newCat.icon}
            onChange={(e) => onChange({ ...newCat, icon: e.target.value })}
            maxLength={4}
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !canSubmit}
          onClick={onSubmit}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creando…" : "Crear categoría"}
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
