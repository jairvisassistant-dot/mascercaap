"use client";

import Image from "next/image";
import type { FileEntry, ProductRow } from "./types";
import {
  fileCardShellClassName,
  formatProductLabel,
  groupedProducts,
  isEntryResolved,
  resolveProductToShow,
  statusBadgeClassName,
  statusBadgeLabel,
} from "./helpers";

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
  return (
    <div className={fileCardShellClassName(entry)}>
      {/* Preview + info */}
      <FileCardSummary
        entry={entry}
        label={label}
        allProducts={allProducts}
        onRemove={onRemove}
      />

      {/* Product selector (for ambiguous / noMatch) */}
      <ProductSelector
        entry={entry}
        lineLabels={lineLabels}
        candidates={candidates}
        allProducts={allProducts}
        onManualSelect={onManualSelect}
      />

      {/* Error detail */}
      <FileCardErrorDetail entry={entry} />
    </div>
  );
}

// ── Child components ──────────────────────────────────────────────────

function FileCardSummary({
  entry,
  label,
  allProducts,
  onRemove,
}: {
  entry: FileEntry;
  label: string;
  allProducts?: ProductRow[];
  onRemove?: (id: string) => void;
}) {
  const productToShow = resolveProductToShow(entry, allProducts);
  const isResolved = isEntryResolved(entry);

  return (
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
            className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusBadgeClassName(entry, isResolved)}`}
          >
            {statusBadgeLabel(entry, label)}
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
  );
}

function ProductSelector({
  entry,
  lineLabels,
  candidates,
  allProducts,
  onManualSelect,
}: {
  entry: FileEntry;
  lineLabels: Record<string, string>;
  candidates?: ProductRow[];
  allProducts?: ProductRow[];
  onManualSelect?: (productId: string) => void;
}) {
  if (entry.match.type !== "ambiguous" && entry.match.type !== "none") {
    return null;
  }
  if (!allProducts || !onManualSelect) return null;

  return (
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
  );
}

function FileCardErrorDetail({ entry }: { entry: FileEntry }) {
  if (entry.uploadStatus !== "error" || !entry.errorMessage) return null;

  return (
    <p className="mt-1.5 text-[10px] leading-tight text-red-500">
      {entry.errorMessage}
    </p>
  );
}
