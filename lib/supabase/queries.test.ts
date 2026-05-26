import { describe, expect, it, vi } from "vitest";

// server-only lanza error al importar fuera de Next.js (vitest node env).
// Lo mockeamos antes de cualquier import del módulo bajo test.
vi.mock("server-only", () => ({}));

import { mapRowToProduct } from "./queries";
import type { Product } from "@/types";

// ── mapRowToProduct ──────────────────────────────────────────────────────────
// Regression: productos con image: null desde Supabase deben normalizarse a "".
// El type Product.image es string (no nullable), y tanto ProductCard como
// ProductGridCard dependen de que image sea siempre string para no romperse.

describe("mapRowToProduct", () => {
  const BASE_ROW: Record<string, unknown> = {
    id: "test-1",
    name: "Pulpa de Maracuyá",
    line: "pulpa-maracuya",
    presentation: "300g",
    presentation_order: 2,
    price: 12000,
    description: "Descripción",
    is_sold_out: false,
    is_best_seller: false,
    featured: false,
  };

  it("normaliza image: null a string vacío", () => {
    const result = mapRowToProduct({ ...BASE_ROW, image: null });
    expect(result.image).toBe("");
  });

  it("normaliza image: undefined a string vacío", () => {
    const result = mapRowToProduct({ ...BASE_ROW, image: undefined });
    expect(result.image).toBe("");
  });

  it("preserva image cuando es string", () => {
    const result = mapRowToProduct({
      ...BASE_ROW,
      image: "https://example.com/img.webp",
    });
    expect(result.image).toBe("https://example.com/img.webp");
  });

  it("retorna un objeto Product válido (shape check)", () => {
    const result = mapRowToProduct({ ...BASE_ROW, image: null });
    const product: Product = result; // type-check: debe cumplir el contrato
    expect(product.id).toBe("test-1");
    expect(product.line).toBe("pulpa-maracuya");
    expect(product.presentation).toBe("300g");
  });
});
