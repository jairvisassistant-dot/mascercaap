"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  matchFileToProducts,
  isNonProductAsset,
  type ProductBrief,
} from "@/lib/match-product-image";

// ── Types ─────────────────────────────────────────────────────────────

export type ProductRow = {
  id: string;
  name: string;
  line: string;
  presentation: string;
  image: string | null;
  display_order: number;
};

type FileEntry = {
  id: string;
  file: File;
  previewUrl: string;
  /** Resultado del matching automático */
  match:
    | { type: "replace"; product: ProductRow }
    | { type: "new"; product: ProductRow }
    | { type: "ambiguous"; candidates: ProductRow[]; reason: string }
    | { type: "none"; reason: string }
    | { type: "skipped"; reason: string };
  /** Producto asignado manualmente (para ambiguous/none) */
  manualProductId: string | null;
  uploadStatus: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
  uploadedUrl?: string;
};

type Props = {
  initialProducts: ProductRow[];
  lineLabels: Record<string, string>;
};

// ── Helpers ───────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

const ACCEPTED_MIME = ["image/webp", "image/jpeg", "image/png"];
const RETRYABLE_STATUSES: ReadonlySet<string> = new Set(["pending", "error"]);
const BATCH_LIMIT = 20;

// ── Componente ─────────────────────────────────────────────────────────

export default function ImagenesAdminClient({
  initialProducts,
  lineLabels,
}: Props) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
   * `manualProductId`: duplicados en el mismo lote (varios archivos al mismo producto).
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
  const allDone = nonSkippedEntries.length > 0 && nonSkippedEntries.every((e) => e.uploadStatus === "done");
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
            reason:
              "No es una imagen de producto (logo, slide, portada, etc.)",
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
        e.id === entryId
          ? { ...e, manualProductId: productId || null }
          : e,
      ),
    );
  }

  // ── Drag & Drop ──────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
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
    const pendingEntries = entries.filter((e) => RETRYABLE_STATUSES.has(e.uploadStatus));
    const batchEntries = pendingEntries.slice(0, BATCH_LIMIT);

    setEntries((prev) =>
      prev.map((e) =>
        pendingEntries.includes(e) ? { ...e, uploadStatus: "pending" as const } : e,
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
      sentEntries.push({ fileIndex, productId: resolvedProductId, entryId: entry.id });
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
              ? { ...e, uploadStatus: "error" as const, errorMessage: data.error ?? "Error en la carga masiva" }
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
      const resultByFileIndex = new Map(
        results.map((r) => [r.fileIndex, r]),
      );

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

  // ── File input click handler ─────────────────────────────────────

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Dropzone ───────────────────────────────────────────── */}
      {/* Hidden file input lives outside <button> to keep interactive-content nesting valid */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={handleFileInputChange}
      />
      <button
        type="button"
        aria-label="Zona de carga de imágenes. Arrastra archivos o presiona Enter para seleccionar"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full relative min-h-[240px] cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 md:min-h-[300px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          dragOver
            ? "border-primary/60 bg-primary/5 shadow-[0_0_0_4px_rgba(63,143,70,0.10)]"
            : "border-border-soft bg-surface-card hover:border-primary/30 hover:bg-primary/[0.03]"
        }`}
      >
        <div className="flex h-full min-h-[176px] flex-col items-center justify-center gap-4 md:min-h-[236px]">
          <span className="text-4xl text-text-faint/40 md:text-5xl">
            {dragOver ? "⬇" : "📁"}
          </span>
          <div>
            <p className="text-base font-semibold text-text-sub md:text-lg">
              {dragOver
                ? "Suelta las imágenes aquí"
                : "Arrastra imágenes o haz clic para seleccionar"}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              .webp, .jpg, .png &mdash; máx 2MB por archivo
            </p>
          </div>
        </div>
      </button>

      {/* ── File Entries Review Panel ──────────────────────────── */}
      {entries.length > 0 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-dark">
              {entries.length} archivo{entries.length !== 1 ? "s" : ""} cargado
              {entries.length !== 1 ? "s" : ""}
            </p>
            {!isUploading && (
              <button
                type="button"
                onClick={clearAllEntries}
                className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>

          {/* ── Auto-matched: Replace ─────────────────────── */}
          {groups.replace.length > 0 && (
            <SectionCard
              title="Reemplazar"
              count={groups.replace.length}
              accent="text-amber-600"
              badge="border-amber-200 bg-amber-50 text-amber-700"
            >
              <EntryGrid>
                {groups.replace.map((entry) => (
                  <FileCard
                    key={entry.id}
                    entry={entry}
                    lineLabels={lineLabels}
                    label="Reemplazar"
                    onRemove={isUploading ? undefined : removeEntry}
                  />
                ))}
              </EntryGrid>
            </SectionCard>
          )}

          {/* ── Auto-matched: New ─────────────────────────── */}
          {groups.newly.length > 0 && (
            <SectionCard
              title="Nuevas"
              count={groups.newly.length}
              accent="text-primary-dark"
              badge="border-primary/20 bg-primary/5 text-primary-dark"
            >
              <EntryGrid>
                {groups.newly.map((entry) => (
                  <FileCard
                    key={entry.id}
                    entry={entry}
                    lineLabels={lineLabels}
                    label="Nueva"
                    onRemove={isUploading ? undefined : removeEntry}
                  />
                ))}
              </EntryGrid>
            </SectionCard>
          )}

          {/* ── Ambiguous ─────────────────────────────────── */}
          {groups.ambiguous.length > 0 && (
            <SectionCard
              title="Múltiples coincidencias"
              count={groups.ambiguous.length}
              accent="text-orange-600"
              badge="border-orange-200 bg-orange-50 text-orange-700"
            >
              <p className="mb-3 text-xs text-text-muted">
                Seleccioná el producto correcto para cada archivo.
              </p>
              <EntryGrid>
                {groups.ambiguous.map((entry) => (
                  <FileCard
                    key={entry.id}
                    entry={entry}
                    lineLabels={lineLabels}
                    label="Conflicto"
                    candidates={
                      entry.match.type === "ambiguous"
                        ? entry.match.candidates
                        : undefined
                    }
                    allProducts={products}
                    onManualSelect={(pid) => setManualProduct(entry.id, pid)}
                    onRemove={isUploading ? undefined : removeEntry}
                  />
                ))}
              </EntryGrid>
            </SectionCard>
          )}

          {/* ── No Match ──────────────────────────────────── */}
          {groups.noMatch.length > 0 && (
            <SectionCard
              title="Sin coincidencia"
              count={groups.noMatch.length}
              accent="text-red-600"
              badge="border-red-200 bg-red-50 text-red-700"
            >
              <p className="mb-3 text-xs text-text-muted">
                No se pudo identificar el producto por el nombre del archivo.
                Seleccioná el producto manualmente.
              </p>
              <EntryGrid>
                {groups.noMatch.map((entry) => (
                  <FileCard
                    key={entry.id}
                    entry={entry}
                    lineLabels={lineLabels}
                    label="Sin match"
                    allProducts={products}
                    onManualSelect={(pid) => setManualProduct(entry.id, pid)}
                    onRemove={isUploading ? undefined : removeEntry}
                  />
                ))}
              </EntryGrid>
            </SectionCard>
          )}

          {/* ── Omitidos ─────────────────────────────────── */}
          {groups.skipped.length > 0 && (
            <SectionCard
              title="Omitidos"
              count={groups.skipped.length}
              accent="text-text-faint"
              badge="border-border-soft bg-surface-warm text-text-muted"
            >
              <p className="mb-3 text-xs text-text-muted">
                Estos archivos no corresponden a imágenes de producto (logos,
                slides, portadas). Quitalos del lote para continuar.
              </p>
              <EntryGrid>
                {groups.skipped.map((entry) => (
                  <FileCard
                    key={entry.id}
                    entry={entry}
                    lineLabels={lineLabels}
                    label="Omitido"
                    onRemove={isUploading ? undefined : removeEntry}
                  />
                ))}
              </EntryGrid>
            </SectionCard>
          )}

          {/* ── Progress summary ──────────────────────────────── */}
          {!allDone && (
            <div className="space-y-3">
              {/* Advertencia: productos duplicados */}
              {duplicateProductIds.size > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  <p className="font-semibold">Productos duplicados en el lote</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {Array.from(duplicateProductIds.entries()).map(
                      ([pid, ids]) => {
                        const product = products.find((p) => p.id === pid);
                        return (
                          <li key={pid}>
                            <span className="font-medium">
                              {product?.name ?? pid}
                            </span>
                            {": "}
                            {ids.length} archivos. Quitá los archivos
                            sobrantes para continuar.
                          </li>
                        );
                      },
                    )}
                  </ul>
                </div>
              )}

              {/* Advertencia: límite de lote */}
              {exceedsBatchLimit && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                  El lote máximo es de {BATCH_LIMIT} archivos.
                  Quitá algunos para poder ejecutar la carga.
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
                  onClick={handleBatchUpload}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(63,143,70,0.8)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isUploading && (
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {isUploading
                    ? "Subiendo..."
                    : "Ejecutar carga masiva"}
                </button>
              </div>
            </div>
          )}

          {/* ── Upload done banner ──────────────────────────────── */}
          {allDone && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-primary-dark">
                {hasErrors
                  ? "Algunas imágenes no pudieron cargarse."
                  : "✅  Todas las imágenes se cargaron correctamente."}
              </p>
              <button
                type="button"
                onClick={clearAllEntries}
                className="rounded-lg border border-border-soft bg-white px-3 py-1.5 text-xs font-semibold text-text-sub transition-colors hover:border-border-mid"
              >
                Cargar más
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function SectionCard({
  title,
  count,
  accent,
  badge,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className={`text-xs font-bold uppercase tracking-[0.15em] ${accent}`}>
          {title}
        </h3>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge}`}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function EntryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function FileCard({
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

// ── Product selector helper ───────────────────────────────────────────

type ProductGroup = {
  label: string;
  products: ProductRow[];
};

function groupedProducts(
  products: ProductRow[],
  lineLabels: Record<string, string>,
): ProductGroup[] {
  const map = new Map<string, ProductRow[]>();
  for (const p of products) {
    const key = p.line;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries())
    .map(([key, prods]) => ({
      label: lineLabels[key] ?? key,
      products: prods,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function formatProductLabel(product: ProductRow): string {
  return `${product.name} — ${product.presentation}`;
}

// ── Match result mapper ───────────────────────────────────────────────

function matchToEntryResult(
  match: ReturnType<typeof matchFileToProducts>,
  products: ProductRow[],
): FileEntry["match"] {
  if (match.type === "single") {
    const product = products.find((p) => p.id === match.product.id);
    if (!product) return { type: "none", reason: "Producto no encontrado" };
    if (product.image) {
      return { type: "replace", product };
    }
    return { type: "new", product };
  }

  if (match.type === "multiple") {
    const candidates = match.candidates.flatMap((c) => {
      const found = products.find((p) => p.id === c.id);
      return found ? [found] : [];
    }) as ProductRow[];
    return {
      type: "ambiguous",
      candidates,
      reason: match.reason,
    };
  }

  return { type: "none", reason: match.reason };
}
