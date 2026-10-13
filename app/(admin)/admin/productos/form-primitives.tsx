"use client";

import { Children, cloneElement, isValidElement, useId } from "react";

export { IdChip } from "./IdChip";
export { ToggleField } from "./ToggleField";

export const inputCls =
  "w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-sm text-text-main placeholder:text-text-faint transition-[border-color,outline-color,box-shadow] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary";

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

