"use client";

import { Children, cloneElement, isValidElement, useId } from "react";

export const inputCls =
  "w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-sm text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const kids = Children.toArray(children);
  const first = kids[0];
  const rest = kids.slice(1);
  const labelledControl = isValidElement(first)
    ? cloneElement(first as React.ReactElement<{ id?: string }>, { id })
    : first;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-text-sub">
        {label}
      </label>
      {labelledControl}
      {rest}
    </div>
  );
}

export function IdChip({
  label,
  value,
  adjusted,
  empty,
  emptyHint,
  fixed,
}: {
  label: string;
  value: string;
  adjusted?: boolean;
  empty?: boolean;
  emptyHint?: string;
  fixed?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-text-sub">{label}</p>
      <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-warm px-4 py-3">
        {empty ? (
          <span className="text-sm italic text-text-faint">{emptyHint ?? "—"}</span>
        ) : (
          <span className="font-mono text-sm text-text-sub">{value}</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {adjusted && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Ajustado
            </span>
          )}
          <span className="rounded-md bg-border-mid/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {fixed ? "Fijo" : "Auto"}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {fixed
          ? "El ID no se puede modificar una vez creado."
          : "Generado automáticamente. No es editable."}
      </p>
    </div>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border-soft bg-surface-warm p-3">
      <span className="text-sm font-medium text-text-sub">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-warm ${
          value ? "bg-primary" : "bg-border-mid"
        }`}
      >
        <span
          className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
