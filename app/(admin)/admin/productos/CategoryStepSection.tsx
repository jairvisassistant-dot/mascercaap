"use client";

import Link from "next/link";
import { Field, inputCls } from "./form-primitives";
import type { Category } from "./producto-form-utils";

type Props = {
  selectedCategory: string;
  loadingCatalog: boolean;
  categories: Category[];
  onCategoryChange: (catKey: string) => void;
};

export function CategoryStepSection({
  selectedCategory,
  loadingCatalog,
  categories,
  onCategoryChange,
}: Props) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        Paso 1 — Categoría
      </p>
      <p className="mb-4 text-xs text-text-muted">
        Elige a qué categoría pertenece este producto.
      </p>
      <Field label="Categoría *">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={loadingCatalog}
          className={`${inputCls} border-primary/30`}
        >
          <option value="">
            {loadingCatalog ? "Cargando categorías..." : "Selecciona una categoría"}
          </option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        {!loadingCatalog && categories.length === 0 && (
          <p className="mt-1.5 text-xs text-text-muted">
            No hay categorías creadas.{" "}
            <Link href="/admin/categorias/nueva" className="font-semibold text-primary underline">
              Crear categoría
            </Link>
          </p>
        )}
      </Field>
    </section>
  );
}
