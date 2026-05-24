"use client";

export default function FAQQuestionItem({
  questionEs,
  questionEn,
  answerEs,
  active,
  index,
  total,
  isMoving,
  anyBusy,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  questionEs: string;
  questionEn: string;
  answerEs: string | null;
  active: boolean;
  index: number;
  total: number;
  isMoving: boolean;
  anyBusy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 transition-shadow hover:shadow-sm ${
        !active
          ? "border-red-100 bg-red-50/30 opacity-60"
          : "border-border-soft bg-surface-warm/60"
      }`}
    >
      {/* índice */}
      <span className="mt-1 w-5 shrink-0 text-center text-[11px] font-bold text-text-faint">
        {index + 1}
      </span>

      {/* flechas de orden */}
      <div className="mt-0.5 flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={index === 0 || anyBusy}
          onClick={onMoveUp}
          className="flex h-5 w-5 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
          title="Subir"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={index === total - 1 || anyBusy}
          onClick={onMoveDown}
          className="flex h-5 w-5 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
          title="Bajar"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* contenido */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-main">{questionEs}</p>
        <p className="text-xs text-text-muted">{questionEn}</p>
        {answerEs && (
          <p className="mt-1 line-clamp-2 text-xs text-text-faint">{answerEs}</p>
        )}
      </div>

      {/* indicador de movimiento */}
      {isMoving && <span className="text-xs text-text-faint">…</span>}

      {/* badge inactiva */}
      {!active && (
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">
          Inactiva
        </span>
      )}

      {/* acciones */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          disabled={anyBusy}
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          title="Editar"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          disabled={anyBusy}
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          title="Eliminar"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
