"use client";

import { inputCls } from "./form-primitives";

type Props = {
  description: string;
  onDescriptionChange: (value: string) => void;
};

export function DescriptionSection({ description, onDescriptionChange }: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Descripción</h2>
      <textarea
        aria-label="Descripción"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        required
        maxLength={300}
        rows={3}
        className={`${inputCls} resize-none`}
      />
      <p className="mt-1 text-xs text-text-muted">{description.length}/300</p>
    </section>
  );
}
