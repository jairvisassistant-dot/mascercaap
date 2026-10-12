"use client";

import Link from "next/link";
import { Field, inputCls } from "./form-primitives";
import type { LineOption } from "./producto-form-utils";

type Props = {
  selectedCategory: string;
  loadingCatalog: boolean;
  lines: LineOption[];
  line: string;
  onLineChange: (value: string) => void;
};

export function LineStepSection({
  selectedCategory,
  loadingCatalog,
  lines,
  line,
  onLineChange,
}: Props) {
  return (
    <section className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-dark">
        Paso 2: Línea de producto
      </p>
      <p className="mb-4 text-xs text-text-muted">
        {selectedCategory
          ? "Líneas disponibles para la categoría seleccionada."
          : "Selecciona primero una categoría para filtrar las líneas."}
      </p>
      <Field label="Línea *">
        <select
          value={line}
          onChange={(e) => onLineChange(e.target.value)}
          disabled={loadingCatalog || lines.length === 0}
          required
          className={inputCls}
        >
          {lines.length === 0 ? (
            <option value="">
              {loadingCatalog ? "Cargando líneas..." : "Sin líneas para esta categoría"}
            </option>
          ) : (
            lines.map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))
          )}
        </select>
        {!loadingCatalog && selectedCategory && lines.length === 0 && (
          <p className="mt-1.5 text-xs text-text-muted">
            No hay líneas en esta categoría.{" "}
            <Link href="/admin/lineas/nueva" className="font-semibold text-primary underline">
              Crear línea
            </Link>
          </p>
        )}
      </Field>
    </section>
  );
}
