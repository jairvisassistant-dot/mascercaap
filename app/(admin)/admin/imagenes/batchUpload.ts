import type { Dispatch, SetStateAction } from "react";
import { BATCH_LIMIT, RETRYABLE_STATUSES } from "./helpers";
import type { FileEntry, ProductRow } from "./types";

type BatchResult = {
  fileIndex: number;
  productId: string;
  status: string;
  url?: string;
  error?: string;
};

/**
 * Uploads the pending/error entries (respecting the batch limit) to
 * /api/admin/images/batch and folds the response back into state.
 *
 * Kept as a plain async function (not part of the component) so the
 * client component stays small and easy to scan.
 */
export async function runBatchUpload({
  entries,
  canExecute,
  setEntries,
  setProducts,
  setIsUploading,
}: {
  entries: FileEntry[];
  canExecute: boolean;
  setEntries: Dispatch<SetStateAction<FileEntry[]>>;
  setProducts: Dispatch<SetStateAction<ProductRow[]>>;
  setIsUploading: Dispatch<SetStateAction<boolean>>;
}): Promise<void> {
  if (!canExecute) return;
  setIsUploading(true);

  const formData = new FormData();
  const sentEntries: Array<{
    fileIndex: number;
    productId: string;
    entryId: string;
  }> = [];

  // Pending + error entries (retries), respecting the batch limit
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

    // Check the status BEFORE reading the body: an upstream 5xx or proxy
    // error page is HTML, not JSON, so parsing it first would throw a JSON
    // syntax error and hide the real failure behind a generic catch.
    if (!res.ok) {
      const errorPayload = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      // Mark batch entries as error, leave others untouched
      const sentIds = new Set(sentEntries.map((e) => e.entryId));
      setEntries((prev) =>
        prev.map((e) =>
          sentIds.has(e.id)
            ? {
                ...e,
                uploadStatus: "error" as const,
                errorMessage:
                  errorPayload?.error ??
                  `Error en la carga masiva (HTTP ${res.status})`,
              }
            : e,
        ),
      );
      setIsUploading(false);
      return;
    }

    const data = await res.json();

    const results: BatchResult[] = data.results ?? [];

    // Map results by fileIndex back to the original entry
    const resultByFileIndex = new Map(results.map((r) => [r.fileIndex, r]));

    // Product image updates are derived from the response alone (no React
    // state), so they are queued here instead of inside the setEntries
    // updater. State updaters must stay pure — React may invoke them twice.
    const productImageUpdates = new Map<string, string>();
    for (const sent of sentEntries) {
      const result = resultByFileIndex.get(sent.fileIndex);
      if (result?.status === "done" && result.url) {
        productImageUpdates.set(sent.productId, result.url);
      }
    }

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

    if (productImageUpdates.size > 0) {
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const url = productImageUpdates.get(p.id);
          return url ? { ...p, image: url } : p;
        }),
      );
    }
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
