"use client";

import { Field, inputCls } from "./form-primitives";

type Props = {
  price: string;
  onPriceChange: (value: string) => void;
};

export function PriceSection({ price, onPriceChange }: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Precio</h2>
      <div className="max-w-sm">
        <Field label="Precio (COP)">
          <input
            type="number"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            min={0}
            placeholder="Opcional"
            className={inputCls}
          />
        </Field>
      </div>
    </section>
  );
}
