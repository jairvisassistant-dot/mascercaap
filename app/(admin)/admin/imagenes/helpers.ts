import {
  isNonProductAsset,
  matchFileToProducts,
  type ProductBrief,
} from "@/lib/match-product-image";
import type { FileEntry, ProductRow } from "./types";

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export const ACCEPTED_MIME = ["image/webp", "image/jpeg", "image/png"];
export const RETRYABLE_STATUSES: ReadonlySet<string> = new Set(["pending", "error"]);
export const BATCH_LIMIT = 20;

export type ProductGroup = {
  label: string;
  products: ProductRow[];
};

export function groupedProducts(
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

export function formatProductLabel(product: ProductRow): string {
  return `${product.name} — ${product.presentation}`;
}

export function matchToEntryResult(
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

/** Product to display on the card: the auto-matched product, or the manual pick. */
export function resolveProductToShow(
  entry: FileEntry,
  allProducts?: ProductRow[],
): ProductRow | null {
  if (
    (entry.match.type === "replace" || entry.match.type === "new") &&
    entry.match.product
  ) {
    return entry.match.product;
  }
  if (entry.manualProductId && allProducts) {
    return allProducts.find((p) => p.id === entry.manualProductId) ?? null;
  }
  return null;
}

/** True once the entry has a resolved product (auto-matched or manually picked). */
export function isEntryResolved(entry: FileEntry): boolean {
  return (
    entry.match.type === "replace" ||
    entry.match.type === "new" ||
    entry.match.type === "skipped" ||
    entry.manualProductId !== null
  );
}

const FILE_CARD_STATUS_COLORS: Record<string, string> = {
  pending: "border-border-soft",
  uploading: "border-blue-300 bg-blue-50/30",
  done: "border-primary/30 bg-primary/[0.04]",
  error: "border-red-300 bg-red-50/30",
};

/** Outer wrapper className of a FileCard, driven by the upload status. */
export function fileCardShellClassName(entry: FileEntry): string {
  const statusColor =
    FILE_CARD_STATUS_COLORS[entry.uploadStatus] ?? "border-border-soft";
  return `relative rounded-xl border p-3 transition-[border-color] ${statusColor} ${
    entry.uploadStatus === "uploading" ? "animate-pulse" : ""
  }`;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-600",
  uploading: "bg-blue-100 text-blue-600",
};

/** Background/text classes for the status badge. */
export function statusBadgeClassName(
  entry: FileEntry,
  isResolved: boolean,
): string {
  return (
    STATUS_BADGE_CLASSES[entry.uploadStatus] ??
    (isResolved
      ? "bg-primary/10 text-primary-dark"
      : "bg-orange-100 text-orange-600")
  );
}

/** Text shown inside the status badge. */
export function statusBadgeLabel(entry: FileEntry, label: string): string {
  if (entry.uploadStatus === "done") return "✓ Cargada";
  if (entry.uploadStatus === "error")
    return `✕ ${entry.errorMessage ?? "Error"}`;
  if (entry.uploadStatus === "uploading") return "Subiendo...";
  return label;
}

/** Builds the per-entry `onManualSelect` callback passed down to FileCard. */
export function makeManualSelectHandler(
  onManualSelect: ((entryId: string, productId: string) => void) | undefined,
  entryId: string,
) {
  return onManualSelect
    ? (productId: string) => onManualSelect(entryId, productId)
    : undefined;
}

/** Builds upload entries from dropped/selected files, skipping rejected MIME types. */
export function buildEntriesFromFiles(
  files: FileList | File[],
  products: ProductRow[],
): FileEntry[] {
  const fileArray = Array.from(files).filter((f) =>
    ACCEPTED_MIME.includes(f.type),
  );

  if (fileArray.length === 0) return [];

  const productBriefs: ProductBrief[] = products.map((p) => ({
    id: p.id,
    line: p.line,
    presentation: p.presentation,
    image: p.image,
  }));

  return fileArray.map((file): FileEntry => {
    // Detect non-product assets (logos, slides, covers, etc.)
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
}
