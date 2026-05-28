"use client";

import Image from "next/image";
import type { FileEntry, ProductRow } from "./types";
import { groupedProducts, formatProductLabel } from "./helpers";

export { SectionCard } from "./SectionCard";
export { EntryGrid } from "./EntryGrid";

// ── FileCard ──────────────────────────────────────────────────────────

export function FileCard({
  entry,
  lineLabels,
  label,
  candidates,
  allProducts,
  onManualSelect,
  onRemove,
}: {
  entry: FileEntry;
  lineLabels: Record<string, string>;
  label: string;
  candidates?: ProductRow[];
  allProducts?: ProductRow[];
  onManualSelect?: (productId: string) => void;
  onRemove?: (id: string) => void;
}) {
  const productToShow =
    (entry.match.type === "replace" || entry.match.type === "new") &&
    entry.match.product
      ? entry.match.product
      : entry.manualProductId && allProducts
        ? allProducts.find((p) => p.id === entry.manualProductId) ?? null
        : null;

  const isResolved =
    entry.match.type === "replace" ||
    entry.match.type === "new" ||
    entry.match.type === "skipped" ||
    entry.manualProductId !== null;

  const statusColor: Record<string, string> = {
    pending: "border-border-soft",
    uploading: "border-blue-300 bg-blue-50/30",
    done: "border-primary/30 bg-primary/[0.04]",
    error: "border-red-300 bg-red-50/30",
  };

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all ${
        statusColor[entry.uploadStatus] ?? "border-border-soft"
      } ${entry.uploadStatus === "uploading" ? "animate-pulse" : ""}`}
    >
      {/* Preview + info */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border-soft bg-white">
          <Image
            src={entry.previewUrl}
            alt={entry.file.name}
            fill
            sizes="56px"
            className="object-contain p-1"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Filename */}
          <p className="truncate text-xs font-medium text-text-sub">
            {entry.file.name}
          </p>
          <p className="text-[10px] text-text-muted">
            {(entry.file.size / 1024).toFixed(0)} KB
          </p>

          {/* Status badge */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                entry.uploadStatus === "done"
                  ? "bg-green-100 text-green-700"
                  : entry.uploadStatus === "error"
                    ? "bg-red-100 text-red-600"
                    : entry.uploadStatus === "uploading"
                      ? "bg-blue-100 text-blue-600"
                      : isResolved
                        ? "bg-primary/10 text-primary-dark"
                        : "bg-orange-100 text-orange-600"
              }`}
            >
              {entry.uploadStatus === "done"
                ? "✓ Cargada"
                : entry.uploadStatus === "error"
                  ? `✕ ${entry.errorMessage ?? "Error"}`
                  : entry.uploadStatus === "uploading"
                    ? "Subiendo..."
                    : label}
            </span>

            {entry.uploadStatus === "done" && productToShow && (
              <span className="text-[9px] text-primary-dark">
                → {formatProductLabel(productToShow)}
              </span>
            )}
          </div>
        </div>

        {/* Remove button */}
        {onRemove && (entry.uploadStatus === "pending" || entry.uploadStatus === "error") && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="shrink-0 rounded-full p-1 text-text-faint hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label="Quitar imagen"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        )}
      </div>

      {/* Product selector (for ambiguous / noMatch) */}
      {(entry.match.type === "ambiguous" || entry.match.type === "none") &&
        allProducts &&
        onManualSelect && (
          <div className="mt-2.5">
            {entry.match.type === "ambiguous" && candidates && (
              <p className="mb-1 text-[10px] text-orange-600">
                {entry.match.reason}
              </p>
            )}
            <select
              aria-label="Seleccionar producto manualmente"
              value={entry.manualProductId ?? ""}
              onChange={(e) => onManualSelect(e.target.value)}
              className="w-full rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-xs text-text-sub focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
              disabled={entry.uploadStatus !== "pending"}
            >
              <option value="">Seleccionar producto</option>
              {groupedProducts(allProducts, lineLabels).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatProductLabel(p)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

      {/* Error detail */}
      {entry.uploadStatus === "error" && entry.errorMessage && (
        <p className="mt-1.5 text-[10px] leading-tight text-red-500">
          {entry.errorMessage}
        </p>
      )}
    </div>
  );
}
