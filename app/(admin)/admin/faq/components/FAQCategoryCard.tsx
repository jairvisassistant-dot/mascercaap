"use client";

export default function FAQCategoryCard({
  icon,
  labelEs,
  labelEn,
  id,
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
  icon: string;
  labelEs: string;
  labelEn: string;
  id: string;
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
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${
        !active
          ? "border-red-200 bg-red-50/40 opacity-70"
          : "border-border-soft bg-surface-card"
      }`}
    >
      {/* índice */}
      <span className="w-6 shrink-0 text-center text-xs font-bold text-text-faint">
        {index + 1}
      </span>

      {/* flechas de orden */}
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={index === 0 || anyBusy}
          onClick={onMoveUp}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
          title="Subir"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={index === total - 1 || anyBusy}
          onClick={onMoveDown}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
          title="Bajar"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* icono */}
      <span className="text-xl">{icon}</span>

      {/* labels */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text-main">
          {labelEs}{" "}
          <span className="font-normal text-text-faint">/</span>{" "}
          <span className="font-normal text-text-muted">{labelEn}</span>
          {!active && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">
              Inactiva
            </span>
          )}
        </p>
        <p className="font-mono text-xs text-text-faint">{id}</p>
      </div>

      {/* indicador de movimiento */}
      {isMoving && <span className="text-xs text-text-faint">…</span>}

      {/* acciones */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={anyBusy}
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          title="Editar"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          disabled={anyBusy}
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          title="Eliminar"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
