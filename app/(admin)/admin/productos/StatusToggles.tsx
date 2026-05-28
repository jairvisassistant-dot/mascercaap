"use client";

import { ToggleField } from "./form-primitives";

type Props = {
  featured: boolean;
  isBestSeller: boolean;
  isSoldOut: boolean;
  active: boolean;
  onFeaturedChange: (v: boolean) => void;
  onBestSellerChange: (v: boolean) => void;
  onSoldOutChange: (v: boolean) => void;
  onActiveChange: (v: boolean) => void;
};

export function StatusToggles({
  featured,
  isBestSeller,
  isSoldOut,
  active,
  onFeaturedChange,
  onBestSellerChange,
  onSoldOutChange,
  onActiveChange,
}: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Estado</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ToggleField label="Destacado" value={featured} onChange={onFeaturedChange} />
        <ToggleField label="Más Vendido" value={isBestSeller} onChange={onBestSellerChange} />
        <ToggleField label="Agotado" value={isSoldOut} onChange={onSoldOutChange} />
        <ToggleField label="Activo" value={active} onChange={onActiveChange} />
      </div>
    </section>
  );
}
