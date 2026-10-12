"use client";

import { Field, IdChip, inputCls } from "./form-primitives";
import { productIdEmptyHint, type ProductMode } from "./producto-form-utils";

type Props = {
  mode: ProductMode;
  line: string;
  name: string;
  presentation: string;
  presentationOrder: number;
  generatedId: string;
  idAdjusted: boolean;
  productId?: string;
  onNameChange: (value: string) => void;
  onPresentationChange: (value: string) => void;
  onPresentationOrderChange: (value: number) => void;
};

export function ProductInfoSection({
  mode,
  line,
  name,
  presentation,
  presentationOrder,
  generatedId,
  idAdjusted,
  productId,
  onNameChange,
  onPresentationChange,
  onPresentationOrderChange,
}: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
        Información del producto
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nombre *">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Presentación *">
          <input
            type="text"
            value={presentation}
            onChange={(e) => onPresentationChange(e.target.value)}
            required
            placeholder="ej: 300g, 1L"
            className={inputCls}
          />
        </Field>
        <Field label="Orden dentro de línea">
          <input
            type="number"
            value={presentationOrder}
            onChange={(e) => onPresentationOrderChange(Number(e.target.value))}
            min={1}
            className={inputCls}
          />
        </Field>
      </div>

      {/* ID chip — create mode: auto-generated / edit mode: fixed existing */}
      <div className="mt-4">
        {mode === "create" ? (
          <IdChip
            label="ID del producto"
            value={generatedId}
            adjusted={idAdjusted}
            empty={!generatedId}
            emptyHint={productIdEmptyHint(line, name)}
          />
        ) : (
          <IdChip label="ID del producto" value={productId ?? ""} fixed />
        )}
      </div>
    </section>
  );
}
