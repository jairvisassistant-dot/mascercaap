"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export type ProductRow = {
  id: string;
  name: string;
  line: string;
  image: string | null;
  display_order: number;
};

type UploadStatus = "idle" | "uploading" | "done" | "error";

type Props = {
  initialProducts: ProductRow[];
  lineLabels: Record<string, string>;
};

export default function ImagenesAdminClient({ initialProducts, lineLabels }: Props) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error subiendo imagen");
    return data.url as string;
  }

  async function saveImageToProduct(productId: string, url: string): Promise<void> {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error guardando imagen");
  }

  async function handleBulkUpload() {
    const selectedList = products.filter((p) => selectedIds.has(p.id));
    const rawPairs = Math.min(selectedList.length, queuedFiles.length);
    const cappedPairs = Math.min(rawPairs, 10);

    setSummary(null);

    if (rawPairs > 10) {
      setGlobalError(
        `El límite es 10 imágenes por 5 minutos. Solo se cargarán las primeras 10.`
      );
    } else {
      setGlobalError(null);
    }

    const pairs = selectedList.slice(0, cappedPairs);
    const files = queuedFiles.slice(0, cappedPairs);

    const initialStatus: Record<string, UploadStatus> = {};
    for (const p of pairs) initialStatus[p.id] = "uploading";
    setUploadStatus((prev) => ({ ...prev, ...initialStatus }));

    let successCount = 0;

    for (let i = 0; i < pairs.length; i++) {
      const product = pairs[i];
      const file = files[i];
      try {
        const url = await uploadFile(file);
        await saveImageToProduct(product.id, url);
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, image: url } : p))
        );
        setUploadStatus((prev) => ({ ...prev, [product.id]: "done" }));
        successCount++;
      } catch {
        setUploadStatus((prev) => ({ ...prev, [product.id]: "error" }));
      }
    }

    setSummary(`${successCount} de ${pairs.length} imágenes cargadas exitosamente.`);
    setQueuedFiles([]);
    if (bulkInputRef.current) bulkInputRef.current.value = "";
  }

  async function handleSingleUpload(productId: string, file: File) {
    setUploadStatus((prev) => ({ ...prev, [productId]: "uploading" }));
    try {
      const url = await uploadFile(file);
      await saveImageToProduct(productId, url);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, image: url } : p))
      );
      setUploadStatus((prev) => ({ ...prev, [productId]: "done" }));
    } catch {
      setUploadStatus((prev) => ({ ...prev, [productId]: "error" }));
    }
  }

  const selectedList = products.filter((p) => selectedIds.has(p.id));
  const pairsCount = Math.min(selectedList.length, queuedFiles.length);
  const filesExceed = queuedFiles.length > selectedList.length;
  const filesShort = queuedFiles.length > 0 && queuedFiles.length < selectedList.length;
  const canUpload = selectedIds.size > 0 && queuedFiles.length > 0;
  const anyUploading = Object.values(uploadStatus).some((s) => s === "uploading");

  return (
    <div className="space-y-5">

      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/12 bg-surface-card p-4 shadow-[0_8px_30px_-18px_rgba(47,111,54,0.3)]">
        <label className="flex cursor-pointer items-center gap-3 select-none">
          <input
            type="checkbox"
            checked={selectedIds.size === products.length && products.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-border-mid accent-primary"
          />
          <span className="text-sm font-semibold text-text-sub">
            Seleccionar todas{" "}
            <span className="font-normal text-text-muted">
              ({selectedIds.size}/{products.length})
            </span>
          </span>
        </label>
        <div className="flex items-center gap-3">
          {summary && (
            <span className="text-sm font-medium text-primary">{summary}</span>
          )}
          <button
            type="button"
            disabled={!canUpload || anyUploading}
            onClick={handleBulkUpload}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(63,143,70,0.8)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {anyUploading ? "Cargando..." : "Cargar imágenes"}
          </button>
        </div>
      </div>

      {globalError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          {globalError}
        </div>
      )}

      {/* Upload panel */}
      {selectedIds.size > 0 && (
        <div className="space-y-4 rounded-2xl border border-border-soft bg-surface-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-dark">
            Panel de carga masiva — {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </p>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className="rounded-xl border border-border-mid bg-surface-warm px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary/40 hover:text-primary-dark">
              Seleccionar archivos
            </span>
            <span className="text-xs text-text-muted">.webp, .jpg, .png — máx 2MB por archivo</span>
            <input
              ref={bulkInputRef}
              type="file"
              multiple
              accept="image/webp,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => setQueuedFiles(Array.from(e.target.files ?? []))}
            />
          </label>

          {queuedFiles.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-text-muted">
                {queuedFiles.length} archivo{queuedFiles.length !== 1 ? "s" : ""} seleccionado{queuedFiles.length !== 1 ? "s" : ""}
                {" — "}se cargarán {Math.min(pairsCount, 10)} imagen{Math.min(pairsCount, 10) !== 1 ? "es" : ""}
              </p>
              {filesExceed && (
                <p className="text-xs font-medium text-amber-600">
                  Se usarán solo los primeros {selectedList.length} archivos
                </p>
              )}
              {filesShort && (
                <p className="text-xs font-medium text-amber-600">
                  Faltan {selectedList.length - queuedFiles.length} archivo{selectedList.length - queuedFiles.length !== 1 ? "s" : ""} para cubrir todos los productos seleccionados
                </p>
              )}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {Array.from({ length: pairsCount }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface-warm px-3 py-2 text-xs"
                  >
                    <span className="truncate font-medium text-text-sub max-w-[40%]">
                      {selectedList[i]?.name}
                    </span>
                    <span className="shrink-0 text-text-faint">←</span>
                    <span className="truncate text-text-muted">{queuedFiles[i]?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const isSelected = selectedIds.has(product.id);
          const status = uploadStatus[product.id] ?? "idle";
          const lineName = lineLabels[product.line] ?? product.line;

          return (
            <div
              key={product.id}
              onClick={() => toggleSelect(product.id)}
              className={`relative cursor-pointer rounded-2xl border-2 bg-surface-card p-3 transition-all ${
                isSelected
                  ? "border-primary shadow-[0_0_0_3px_rgba(63,143,70,0.12)]"
                  : "border-border-soft hover:border-border-mid"
              }`}
            >
              {/* Checkbox */}
              <div className="absolute left-2.5 top-2.5 z-10" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(product.id)}
                  className="h-4 w-4 rounded border-border-mid accent-primary"
                />
              </div>

              {/* Status badge */}
              {status !== "idle" && (
                <div className="absolute right-2.5 top-2.5 z-10">
                  {status === "uploading" && (
                    <span className="flex h-6 w-6 animate-spin items-center justify-center rounded-full bg-surface-card text-xs text-text-faint">
                      ↻
                    </span>
                  )}
                  {status === "done" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">
                      ✓
                    </span>
                  )}
                  {status === "error" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-500">
                      ✕
                    </span>
                  )}
                </div>
              )}

              {/* Image area */}
              <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-surface-warm">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-text-faint">
                    ?
                  </div>
                )}
              </div>

              {/* Name + line */}
              <p className="truncate text-sm font-semibold text-text-main">{product.name}</p>
              <p className="truncate text-xs text-text-muted">{lineName}</p>

              {/* Per-card upload */}
              <label
                className="mt-2.5 flex cursor-pointer items-center justify-center rounded-lg border border-border-soft bg-surface-warm px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary/30 hover:text-primary-dark"
                onClick={(e) => e.stopPropagation()}
              >
                {status === "uploading" ? "Subiendo..." : "cambiar imagen"}
                <input
                  type="file"
                  accept="image/webp,image/jpeg,image/png"
                  className="hidden"
                  disabled={status === "uploading"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSingleUpload(product.id, file);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
