import { matchFileToProducts } from "@/lib/match-product-image";
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
