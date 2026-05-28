"use client";

import type { Product, ProductCategory, ProductLineConfig } from "@/types";
import type { AvailabilityCopy } from "./types";

interface ContactAvailabilitySelectorProps {
  availability: AvailabilityCopy;
  selectedCategoryKey: string;
  selectedLineKey: string;
  selectedProductId: string;
  availabilityError: string | null;
  mensaje: string;
  categories: ProductCategory[];
  visibleLines: ProductLineConfig[];
  visibleProducts: Product[];
  linesByKey: Map<string, ProductLineConfig>;
  onSelectCategory: (key: string, mensaje: string) => void;
  onSelectLine: (key: string, mensaje: string) => void;
  onSelectProduct: (id: string, mensaje: string, clearMensajeError: boolean) => void;
}

function stripAvailabilityTemplate(message: string, additionalInfoLabel: string) {
  const marker = `${additionalInfoLabel}:`;
  const markerIndex = message.indexOf(marker);
  if (markerIndex === -1) return message;
  return message.slice(markerIndex + marker.length).trimStart();
}

function buildAvailabilityTemplate(params: {
  categoryLabel: string;
  lineLabel: string;
  productLabel: string;
  copy: AvailabilityCopy;
  existingMessage: string;
}) {
  const { categoryLabel, lineLabel, productLabel, copy, existingMessage } = params;
  const customMessage = stripAvailabilityTemplate(existingMessage, copy.additionalInfoLabel);

  return [
    copy.templateTitle,
    `${copy.templateCategoryLabel}: ${categoryLabel}`,
    `${copy.templateLineLabel}: ${lineLabel}`,
    `${copy.templateProductLabel}: ${productLabel}`,
    "",
    `${copy.additionalInfoLabel}:`,
    customMessage,
  ].join("\n").trimEnd();
}

export default function ContactAvailabilitySelector({
  availability,
  selectedCategoryKey,
  selectedLineKey,
  selectedProductId,
  availabilityError,
  mensaje,
  categories,
  visibleLines,
  visibleProducts,
  linesByKey,
  onSelectCategory,
  onSelectLine,
  onSelectProduct,
}: ContactAvailabilitySelectorProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border-soft bg-surface-soft p-4">
      <p className="text-sm font-semibold text-text-main">{availability.title}</p>

      {/* Paso 1 — Categoría */}
      <div>
        <label htmlFor="availability-category" className="block text-sm font-medium text-text-sub mb-1">
          {availability.categoryLabel}
        </label>
        <select
          id="availability-category"
          value={selectedCategoryKey}
          onChange={(e) => {
            const stripped = stripAvailabilityTemplate(mensaje, availability.additionalInfoLabel);
            onSelectCategory(e.target.value, stripped);
          }}
          className="mt-3 w-full rounded-lg border border-border-mid bg-surface-card px-4 py-3 text-text-main transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
        >
          <option value="">{availability.categoryPlaceholder}</option>
          {categories.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Paso 2 — Línea */}
      <div>
        <label htmlFor="availability-line" className="block text-sm font-medium text-text-sub mb-1">
          {availability.linesLabel}
        </label>
        <select
          id="availability-line"
          value={selectedLineKey}
          disabled={!selectedCategoryKey}
          onChange={(e) => {
            const stripped = stripAvailabilityTemplate(mensaje, availability.additionalInfoLabel);
            onSelectLine(e.target.value, stripped);
          }}
          className="mt-3 w-full rounded-lg border border-border-mid bg-surface-card px-4 py-3 text-text-main transition-all focus:border-transparent focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{availability.linePlaceholder}</option>
          {visibleLines.map((line) => (
            <option key={line.key} value={line.key}>
              {line.label}
            </option>
          ))}
        </select>
      </div>

      {/* Paso 3 — Producto */}
      <div>
        <label htmlFor="availability-product" className="block text-sm font-medium text-text-sub mb-1">
          {availability.productsLabel}
        </label>
        <select
          id="availability-product"
          value={selectedProductId}
          onChange={(e) => {
            const newProductId = e.target.value;
            if (newProductId && selectedCategoryKey && selectedLineKey) {
              const cat = categories.find((c) => c.key === selectedCategoryKey);
              const line = linesByKey.get(selectedLineKey);
              const product = visibleProducts.find((p) => p.id === newProductId);
              if (cat && line && product) {
                const newMensaje = buildAvailabilityTemplate({
                  categoryLabel: cat.label,
                  lineLabel: line.label,
                  productLabel: `${product.name} (${product.presentation})`,
                  copy: availability,
                  existingMessage: mensaje,
                });
                onSelectProduct(newProductId, newMensaje, true);
                return;
              }
            }
            const stripped = stripAvailabilityTemplate(mensaje, availability.additionalInfoLabel);
            onSelectProduct(newProductId, stripped, false);
          }}
          disabled={!selectedLineKey}
          className="mt-3 w-full rounded-lg border border-border-mid bg-surface-card px-4 py-3 text-text-main transition-all focus:border-transparent focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{availability.productPlaceholder}</option>
          {visibleProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.presentation})
            </option>
          ))}
        </select>

        {availabilityError && (
          <p className="mt-2 text-sm text-red-500">{availabilityError}</p>
        )}
      </div>
    </div>
  );
}
