"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  isNonProductAsset,
  matchFileToProducts,
  type ProductBrief,
} from "@/lib/match-product-image";
import type { ProductRow, FileEntry } from "./types";
import {
  generateId,
  ACCEPTED_MIME,
  RETRYABLE_STATUSES,
  BATCH_LIMIT,
  matchToEntryResult,
} from "./helpers";
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
  entriesRef.current = entries;

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
    const fileArray = Array.from(files).filter((f) =>
      ACCEPTED_MIME.includes(f.type),
    );

    if (fileArray.length === 0) return;

    const productBriefs: ProductBrief[] = products.map((p) => ({
      id: p.id,
      line: p.line,
      presentation: p.presentation,
      image: p.image,
    }));

    const newEntries: FileEntry[] = fileArray.map((file) => {
      // Detectar assets no-producto (logos, slides, portadas, etc.)
      if (isNonProductAsset(file.name)) {
        return {
          id: generateId(),
          file,
          previewUrl: URL.createObjectURL(file),
          match: {
            type: "skipped",
            reason: "No es una imagen de producto (logo, slide, portada, etc.)",
          },
          manualProductId: null,
          uploadStatus: "pending",
        };
      }

      const match = matchFileToProducts(file.name, productBriefs);
      return {
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        match: matchToEntryResult(match, products),
        manualProductId: null,
        uploadStatus: "pending",
      };
    });

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

  // ── Upload ───────────────────────────────────────────────────────

  async function handleBatchUpload() {
    if (!canExecute) return;
    setIsUploading(true);

    const formData = new FormData();
    const sentEntries: Array<{
      fileIndex: number;
      productId: string;
      entryId: string;
    }> = [];

    // Tomar entradas pendientes + con error (reintentos), respetando el límite del lote
    const pendingEntries = entries.filter((e) =>
      RETRYABLE_STATUSES.has(e.uploadStatus),
    );
    const batchEntries = pendingEntries.slice(0, BATCH_LIMIT);

    setEntries((prev) =>
      prev.map((e) =>
        pendingEntries.includes(e)
          ? { ...e, uploadStatus: "pending" as const }
          : e,
      ),
    );

    let fileIndex = 0;
    for (const entry of batchEntries) {
      const resolvedProductId =
        entry.match.type === "replace" || entry.match.type === "new"
          ? entry.match.product.id
          : entry.manualProductId;

      if (!resolvedProductId) continue;

      formData.append(`file_${fileIndex}`, entry.file);
      sentEntries.push({
        fileIndex,
        productId: resolvedProductId,
        entryId: entry.id,
      });
      fileIndex++;
    }

    formData.append(
      "entries",
      JSON.stringify(
        sentEntries.map((se) => ({
          fileIndex: se.fileIndex,
          productId: se.productId,
        })),
      ),
    );

    try {
      const res = await fetch("/api/admin/images/batch", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        // Mark batch entries as error, leave others untouched
        const sentIds = new Set(sentEntries.map((e) => e.entryId));
        setEntries((prev) =>
          prev.map((e) =>
            sentIds.has(e.id)
              ? {
                  ...e,
                  uploadStatus: "error" as const,
                  errorMessage: data.error ?? "Error en la carga masiva",
                }
              : e,
          ),
        );
        setIsUploading(false);
        return;
      }

      const results: Array<{
        fileIndex: number;
        productId: string;
        status: string;
        url?: string;
        error?: string;
      }> = data.results ?? [];

      // Map results by fileIndex back to the original entry
      const resultByFileIndex = new Map(results.map((r) => [r.fileIndex, r]));

      setEntries((prev) => {
        const next = [...prev];
        const entryIndexMap = new Map(next.map((e, i) => [e.id, i]));
        for (const sent of sentEntries) {
          const result = resultByFileIndex.get(sent.fileIndex);
          if (!result) continue;

          const idx = entryIndexMap.get(sent.entryId) ?? -1;
          if (idx === -1) continue;

          if (result.status === "done") {
            next[idx] = {
              ...next[idx],
              uploadStatus: "done",
              uploadedUrl: result.url,
            };

            if (result.url) {
              const pid = sent.productId;
              setProducts((prevProducts) =>
                prevProducts.map((p) =>
                  p.id === pid ? { ...p, image: result.url! } : p,
                ),
              );
            }
          } else {
            next[idx] = {
              ...next[idx],
              uploadStatus: "error",
              errorMessage: result.error ?? "Error desconocido",
            };
          }
        }
        return next;
      });
    } catch (e) {
      setEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          uploadStatus: "error" as const,
          errorMessage:
            e instanceof Error ? e.message : "Error de red inesperado",
        })),
      );
    }

    setIsUploading(false);
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
