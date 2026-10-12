"use client";

import type { FileEntry, ProductRow } from "./types";
import { BATCH_LIMIT, makeManualSelectHandler } from "./helpers";
import { SectionCard, EntryGrid, FileCard } from "./FileCard";

type Groups = {
  replace: FileEntry[];
  newly: FileEntry[];
  ambiguous: FileEntry[];
  noMatch: FileEntry[];
  skipped: FileEntry[];
};

type Props = {
  entries: FileEntry[];
  groups: Groups;
  products: ProductRow[];
  lineLabels: Record<string, string>;
  isUploading: boolean;
  canExecute: boolean;
  allDone: boolean;
  hasErrors: boolean;
  needsResolutionCount: number;
  duplicateProductIds: Map<string, string[]>;
  exceedsBatchLimit: boolean;
  onRemove: (id: string) => void;
  onManualSelect: (entryId: string, productId: string) => void;
  onClearAll: () => void;
  onUpload: () => void;
};

export function ImageEntryPanel({
  entries,
  groups,
  products,
  lineLabels,
  isUploading,
  canExecute,
  allDone,
  hasErrors,
  needsResolutionCount,
  duplicateProductIds,
  exceedsBatchLimit,
  onRemove,
  onManualSelect,
  onClearAll,
  onUpload,
}: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <PanelHeader
        entriesCount={entries.length}
        isUploading={isUploading}
        onClearAll={onClearAll}
      />

      {/* ── Auto-matched: Replace ─────────────────────── */}
      <EntrySection
        entries={groups.replace}
        title="Reemplazar"
        accent="text-amber-600"
        badge="border-amber-200 bg-amber-50 text-amber-700"
        label="Reemplazar"
        lineLabels={lineLabels}
        onRemove={onRemove}
        isUploading={isUploading}
      />

      {/* ── Auto-matched: New ─────────────────────────── */}
      <EntrySection
        entries={groups.newly}
        title="Nuevas"
        accent="text-primary-dark"
        badge="border-primary/20 bg-primary/5 text-primary-dark"
        label="Nueva"
        lineLabels={lineLabels}
        onRemove={onRemove}
        isUploading={isUploading}
      />

      {/* ── Ambiguous ─────────────────────────────────── */}
      <EntrySection
        entries={groups.ambiguous}
        title="Múltiples coincidencias"
        accent="text-orange-600"
        badge="border-orange-200 bg-orange-50 text-orange-700"
        label="Conflicto"
        description="Seleccioná el producto correcto para cada archivo."
        showCandidates
        products={products}
        lineLabels={lineLabels}
        onManualSelect={onManualSelect}
        onRemove={onRemove}
        isUploading={isUploading}
      />

      {/* ── No Match ──────────────────────────────────── */}
      <EntrySection
        entries={groups.noMatch}
        title="Sin coincidencia"
        accent="text-red-600"
        badge="border-red-200 bg-red-50 text-red-700"
        label="Sin match"
        description="No se pudo identificar el producto por el nombre del archivo. Seleccioná el producto manualmente."
        products={products}
        lineLabels={lineLabels}
        onManualSelect={onManualSelect}
        onRemove={onRemove}
        isUploading={isUploading}
      />

      {/* ── Omitidos ─────────────────────────────────── */}
      <EntrySection
        entries={groups.skipped}
        title="Omitidos"
        accent="text-text-faint"
        badge="border-border-soft bg-surface-warm text-text-muted"
        label="Omitido"
        description="Estos archivos no corresponden a imágenes de producto (logos, slides, portadas). Quitalos del lote para continuar."
        lineLabels={lineLabels}
        onRemove={onRemove}
        isUploading={isUploading}
      />

      {/* ── Progress summary ──────────────────────────────── */}
      {!allDone && (
        <ProgressSummary
          groups={groups}
          products={products}
          needsResolutionCount={needsResolutionCount}
          duplicateProductIds={duplicateProductIds}
          exceedsBatchLimit={exceedsBatchLimit}
          isUploading={isUploading}
          canExecute={canExecute}
          onUpload={onUpload}
        />
      )}

      {/* ── Upload done banner ──────────────────────────────── */}
      {allDone && (
        <UploadDoneBanner hasErrors={hasErrors} onClearAll={onClearAll} />
      )}
    </div>
  );
}

// ── Child components ──────────────────────────────────────────────────

function PanelHeader({
  entriesCount,
  isUploading,
  onClearAll,
}: {
  entriesCount: number;
  isUploading: boolean;
  onClearAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-dark">
        {entriesCount} archivo{entriesCount !== 1 ? "s" : ""} cargado
        {entriesCount !== 1 ? "s" : ""}
      </p>
      {!isUploading && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}

function EntrySection({
  entries,
  title,
  accent,
  badge,
  label,
  description,
  showCandidates,
  products,
  lineLabels,
  onManualSelect,
  onRemove,
  isUploading,
}: {
  entries: FileEntry[];
  title: string;
  accent: string;
  badge: string;
  label: string;
  description?: string;
  showCandidates?: boolean;
  products?: ProductRow[];
  lineLabels: Record<string, string>;
  onManualSelect?: (entryId: string, productId: string) => void;
  onRemove?: (id: string) => void;
  isUploading: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <SectionCard title={title} count={entries.length} accent={accent} badge={badge}>
      {description && (
        <p className="mb-3 text-xs text-text-muted">{description}</p>
      )}
      <EntryGrid>
        {entries.map((entry) => (
          <FileCard
            key={entry.id}
            entry={entry}
            lineLabels={lineLabels}
            label={label}
            candidates={
              showCandidates && entry.match.type === "ambiguous"
                ? entry.match.candidates
                : undefined
            }
            allProducts={products}
            onManualSelect={makeManualSelectHandler(onManualSelect, entry.id)}
            onRemove={isUploading ? undefined : onRemove}
          />
        ))}
      </EntryGrid>
    </SectionCard>
  );
}

function ProgressSummary({
  groups,
  products,
  needsResolutionCount,
  duplicateProductIds,
  exceedsBatchLimit,
  isUploading,
  canExecute,
  onUpload,
}: {
  groups: Groups;
  products: ProductRow[];
  needsResolutionCount: number;
  duplicateProductIds: Map<string, string[]>;
  exceedsBatchLimit: boolean;
  isUploading: boolean;
  canExecute: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Advertencia: productos duplicados */}
      {duplicateProductIds.size > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <p className="font-semibold">Productos duplicados en el lote</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {Array.from(duplicateProductIds.entries()).map(([pid, ids]) => {
              const product = products.find((p) => p.id === pid);
              return (
                <li key={pid}>
                  <span className="font-medium">
                    {product?.name ?? pid}
                  </span>
                  {": "}
                  {ids.length} archivos. Quitá los archivos sobrantes para
                  continuar.
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Advertencia: límite de lote */}
      {exceedsBatchLimit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          El lote máximo es de {BATCH_LIMIT} archivos. Quitá algunos para
          poder ejecutar la carga.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface-card p-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span className="font-medium text-text-sub">
            <span className="text-amber-600 font-semibold">
              {groups.replace.length}
            </span>{" "}
            reemplazo{groups.replace.length !== 1 ? "s" : ""}
          </span>
          <span className="font-medium text-text-sub">
            <span className="text-primary-dark font-semibold">
              {groups.newly.length}
            </span>{" "}
            nueva{groups.newly.length !== 1 ? "s" : ""}
          </span>
          {needsResolutionCount > 0 && (
            <span className="font-medium text-text-sub">
              <span className="text-orange-600 font-semibold">
                {needsResolutionCount}
              </span>{" "}
              requiere{needsResolutionCount !== 1 ? "n" : ""} atención
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={!canExecute}
          onClick={onUpload}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(63,143,70,0.8)] transition-[transform,opacity,background-color] hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isUploading && (
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {isUploading ? "Subiendo..." : "Ejecutar carga masiva"}
        </button>
      </div>
    </div>
  );
}

function UploadDoneBanner({
  hasErrors,
  onClearAll,
}: {
  hasErrors: boolean;
  onClearAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-primary-dark">
        {hasErrors
          ? "Algunas imágenes no pudieron cargarse."
          : "✅  Todas las imágenes se cargaron correctamente."}
      </p>
      <button
        type="button"
        onClick={onClearAll}
        className="rounded-lg border border-border-soft bg-white px-3 py-1.5 text-xs font-semibold text-text-sub transition-colors hover:border-border-mid"
      >
        Cargar más
      </button>
    </div>
  );
}
