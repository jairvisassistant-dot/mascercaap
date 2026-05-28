"use client";

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
