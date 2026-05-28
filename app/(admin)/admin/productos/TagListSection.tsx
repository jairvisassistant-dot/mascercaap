"use client";

import { inputCls } from "./form-primitives";

type Props = {
  title: string;
  items: string[];
  newValue: string;
  inputAriaLabel: string;
  inputPlaceholder: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export function TagListSection({
  title,
  items,
  newValue,
  inputAriaLabel,
  inputPlaceholder,
  onNewValueChange,
  onAdd,
  onRemove,
}: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">{title}</h2>
      <div className="mb-3 space-y-2">
        {items.map((item, i) => (
          <div key={`${i}-${item}`} className="flex items-center gap-2">
            <span className="flex-1 rounded-xl bg-surface-warm px-3 py-2 text-sm text-text-sub ring-1 ring-border-soft">
              {item}
            </span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          aria-label={inputAriaLabel}
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={inputPlaceholder}
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          +
        </button>
      </div>
    </section>
  );
}
