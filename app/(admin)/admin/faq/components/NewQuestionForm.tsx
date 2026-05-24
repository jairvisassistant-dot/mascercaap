"use client";

import type { NewQuestion } from "./types";

export default function NewQuestionForm({
  busy,
  newQ,
  onChange,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  newQ: NewQuestion;
  onChange: (q: NewQuestion) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const canSubmit = newQ.question_es.trim() && newQ.question_en.trim() && newQ.answer_es.trim() && newQ.answer_en.trim();
  return (
    <div className="rounded-2xl border border-primary/40 bg-surface-card px-4 py-4 shadow-sm ring-1 ring-primary/15">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        Nueva pregunta
      </p>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-sub">Pregunta (ES) *</label>
            <input
              type="text"
              autoFocus
              value={newQ.question_es}
              onChange={(e) => onChange({ ...newQ, question_es: e.target.value })}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-sub">Question (EN) *</label>
            <input
              type="text"
              value={newQ.question_en}
              onChange={(e) => onChange({ ...newQ, question_en: e.target.value })}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Respuesta (ES) *</label>
          <textarea
            value={newQ.answer_es}
            onChange={(e) => onChange({ ...newQ, answer_es: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-sub">Answer (EN) *</label>
          <textarea
            value={newQ.answer_en}
            onChange={(e) => onChange({ ...newQ, answer_en: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
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
          {busy ? "Creando…" : "Crear pregunta"}
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
