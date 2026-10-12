"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ProductRow, FileEntry } from "./types";
import {
  buildEntriesFromFiles,
  RETRYABLE_STATUSES,
  BATCH_LIMIT,
} from "./helpers";
import { runBatchUpload } from "./batchUpload";
import { ImageUploader } from "./ImageUploader";
import { ImageEntryPanel } from "./ImageEntryPanel";

export type { ProductRow };

type Props = {
  initialProducts: ProductRow[];
  lineLabels: Record<string, string>;
};

export default function ImagenesAdminClient({
  initialProducts,
  lineLabels,
}: Props) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const entriesRef = useRef(entries);
  // Written in an effect, never during render: mutating a ref while rendering
  // is not allowed (React may discard or repeat a render at any time).
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Limpiar object URLs al desmontar (solo una vez, sin dep en entries)
  useEffect(() => {
    return () => {
      for (const e of entriesRef.current) {
        URL.revokeObjectURL(e.previewUrl);
      }
    };
  }, []);

  // ── Agrupación de resultados ──────────────────────────────────────

  const groups = useMemo(() => {
    const replace: FileEntry[] = [];
    const newly: FileEntry[] = [];
    const ambiguous: FileEntry[] = [];
    const noMatch: FileEntry[] = [];
    const skipped: FileEntry[] = [];
    for (const e of entries) {
      switch (e.match.type) {
        case "replace":
          replace.push(e);
          break;
        case "new":
          newly.push(e);
          break;
        case "ambiguous":
          ambiguous.push(e);
          break;
        case "none":
          noMatch.push(e);
          break;
        case "skipped":
          skipped.push(e);
          break;
      }
    }
    return { replace, newly, ambiguous, noMatch, skipped };
  }, [entries]);

  /**
   * Entries ambiguous/none que el usuario todavía no resolvió manualmente.
   * Estas son las únicas que bloquean la ejecución.
   */
  const unresolvedEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          (e.match.type === "ambiguous" || e.match.type === "none") &&
          !e.manualProductId,
      ),
    [entries],
  );

  const needsResolutionCount = unresolvedEntries.length;

  /**
   * Detecta duplicados en el mismo lote (varios archivos al mismo producto).
   */
  const duplicateProductIds = useMemo(() => {
    const pidToEntryIds = new Map<string, string[]>();
    for (const e of entries) {
      if (!RETRYABLE_STATUSES.has(e.uploadStatus)) continue;
      const pid =
        e.match.type === "replace" || e.match.type === "new"
          ? e.match.product.id
          : e.manualProductId;
      if (!pid) continue;
      const existing = pidToEntryIds.get(pid) ?? [];
      existing.push(e.id);
      pidToEntryIds.set(pid, existing);
    }
    const dups = new Map<string, string[]>();
    for (const [pid, ids] of pidToEntryIds) {
      if (ids.length > 1) dups.set(pid, ids);
    }
    return dups;
  }, [entries]);

  const exceedsBatchLimit =
    entries.filter((e) => RETRYABLE_STATUSES.has(e.uploadStatus)).length > BATCH_LIMIT;

  /** Tiene al menos una entry lista para enviar (no skipped, no done, no uploading) */
  const hasSendableEntries = entries.some((e) => {
    if (!RETRYABLE_STATUSES.has(e.uploadStatus)) return false;
    if (e.match.type === "skipped") return false;
    const pid =
      e.match.type === "replace" || e.match.type === "new"
        ? e.match.product.id
        : e.manualProductId;
    return !!pid;
  });

  const canExecute =
    entries.length > 0 &&
    hasSendableEntries &&
    needsResolutionCount === 0 &&
    duplicateProductIds.size === 0 &&
    !exceedsBatchLimit &&
    !isUploading;

  const nonSkippedEntries = entries.filter((e) => e.match.type !== "skipped");
  const allDone =
    nonSkippedEntries.length > 0 &&
    nonSkippedEntries.every((e) => e.uploadStatus === "done");
  const hasErrors = entries.some((e) => e.uploadStatus === "error");

  // ── File processing ───────────────────────────────────────────────

  function processFiles(files: FileList | File[]) {
    const newEntries = buildEntriesFromFiles(files, products);
    if (newEntries.length === 0) return;
    setEntries((prev) => [...prev, ...newEntries]);
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((e) => e.id !== id);
    });
  }

  function clearAllEntries() {
    for (const e of entries) URL.revokeObjectURL(e.previewUrl);
    setEntries([]);
  }

  function setManualProduct(entryId: string, productId: string) {
    // El <select> emite "" para la opción placeholder — normalizar a null
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, manualProductId: productId || null } : e,
      ),
    );
  }

  // ── Upload ───────────────────────────────────────────────────────────

  function handleBatchUpload() {
    return runBatchUpload({
      entries,
      canExecute,
      setEntries,
      setProducts,
      setIsUploading,
    });
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <ImageUploader onFiles={processFiles} />
      <ImageEntryPanel
        entries={entries}
        groups={groups}
        products={products}
        lineLabels={lineLabels}
        isUploading={isUploading}
        canExecute={canExecute}
        allDone={allDone}
        hasErrors={hasErrors}
        needsResolutionCount={needsResolutionCount}
        duplicateProductIds={duplicateProductIds}
        exceedsBatchLimit={exceedsBatchLimit}
        onRemove={removeEntry}
        onManualSelect={setManualProduct}
        onClearAll={clearAllEntries}
        onUpload={handleBatchUpload}
      />
    </div>
  );
}
