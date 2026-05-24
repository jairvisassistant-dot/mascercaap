"use client";

import type { QuestionEdit } from "./types";

export default function QuestionEditForm({
  q,
  vals,
  busy,
  onCancel,
  onSave,
  onChange,
}: {
  q: { id: string };
  vals: QuestionEdit;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  onChange: (patch: Partial<QuestionEdit>) => void;
}) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-surface-card px-4 py-4 shadow-sm ring-1 ring-primary/15">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        Editando pregunta ·{" "}
        <span className="font-mono normal-case tracking-normal text-text-faint">{q.id}</span>
      </p>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-sub">Pregunta (ES) *</label>
            <input
              type="text"
              autoFocus
              value={vals.question_es}
              onChange={(e) => onChange({ question_es: e.target.value })}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-sub">Question (EN) *</label>
            <input
              type="text"
              value={vals.question_en}
              onChange={(e) => onChange({ question_en: e.target.value })}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Respuesta (ES) *</label>
          <textarea
            value={vals.answer_es}
            onChange={(e) => onChange({ answer_es: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Answer (EN) *</label>
          <textarea
            value={vals.answer_en}
            onChange={(e) => onChange({ answer_en: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">
            Keywords{" "}
            <span className="font-normal text-text-faint">(separadas por coma)</span>
          </label>
          <input
            type="text"
            value={vals.keywords}
            onChange={(e) => onChange({ keywords: e.target.value })}
            placeholder="ej: envio, domicilio, costo"
            className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={
            busy ||
            !vals.question_es.trim() ||
            !vals.question_en.trim() ||
            !vals.answer_es.trim() ||
            !vals.answer_en.trim()
          }
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
