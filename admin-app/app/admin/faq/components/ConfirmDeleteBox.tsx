"use client";
import type { ReactNode } from "react";

export default function ConfirmDeleteBox({
  title,
  subtext,
  busy,
  onConfirm,
  onCancel,
  confirmText = "Sí, eliminar",
  busyText = "Eliminando…",
}: {
  title: ReactNode;
  subtext?: ReactNode;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  busyText?: string;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 px-4 py-4 shadow-sm">
      <p className="mb-1 text-sm font-semibold text-red-800">{title}</p>
      {subtext && <div className="mb-3 text-xs text-red-600">{subtext}</div>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? busyText : confirmText}
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
