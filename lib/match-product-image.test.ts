import { describe, expect, it } from "vitest";
import {
  parsePulpaFilename,
  parseSkuFilename,
  parseProductFilename,
  normalizePresentation,
  matchParsedFile,
  matchFileToProducts,
  isNonProductAsset,
  isSupportedImage,
  groupResults,
  type ProductBrief,
  type MatchResult,
  type ParsedFile,
} from "./match-product-image";

// ── Productos de prueba ──────────────────────────────────────────────

const products: ProductBrief[] = [
  { id: "p1", line: "pulpa-maracuya",  presentation: "300g",  image: null },
  { id: "p2", line: "pulpa-maracuya",  presentation: "120g",  image: "maracuya-120.jpg" },
  { id: "p3", line: "pulpa-maracuya",  presentation: "1000g", image: null },
  { id: "p4", line: "pulpa-fresa",     presentation: "120g",  image: null },
  { id: "p5", line: "pulpa-fresa",     presentation: "300g",  image: "fresa-300.jpg" },
  { id: "p6", line: "pulpa-mango",     presentation: "1000g", image: null },
  { id: "p7", line: "pulpa-mango",     presentation: "120g",  image: "mango-120.jpg" },
  { id: "p8", line: "pulpa-mango",     presentation: "120g",  image: null },
    // p7 + p8 comparten line+presentation → ambiguous
  { id: "p9", line: "limon",           presentation: "1L",     image: null },
];

// ── parsePulpaFilename ───────────────────────────────────────────────

describe("parsePulpaFilename", () => {
  it("parses pulpa-maracuya300.webp → { flavor: maracuya, weight: 300 }", () => {
    expect(parsePulpaFilename("pulpa-maracuya300.webp")).toEqual({
      flavor: "maracuya",
      weight: "300",
    });
  });

  it("parses pulpa-fresa120.webp → { flavor: fresa, weight: 120 }", () => {
    expect(parsePulpaFilename("pulpa-fresa120.webp")).toEqual({
      flavor: "fresa",
      weight: "120",
    });
  });

  it("parses pulpa-mango1000.webp → { flavor: mango, weight: 1000 }", () => {
    expect(parsePulpaFilename("pulpa-mango1000.webp")).toEqual({
      flavor: "mango",
      weight: "1000",
    });
  });

  it("parses pulpa-mango1000V2.webp ignoring version suffix", () => {
    expect(parsePulpaFilename("pulpa-mango1000V2.webp")).toEqual({
      flavor: "mango",
      weight: "1000",
    });
  });

  it("parses pulpa-mango1000g.webp with explicit g suffix", () => {
    expect(parsePulpaFilename("pulpa-mango1000g.webp")).toEqual({
      flavor: "mango",
      weight: "1000",
    });
  });

  it("returns null for non-matching filename", () => {
    expect(parsePulpaFilename("logo.webp")).toBeNull();
    expect(parsePulpaFilename("slide-01.webp")).toBeNull();
    expect(parsePulpaFilename("pulpa.webp")).toBeNull();
    expect(parsePulpaFilename("")).toBeNull();
  });

  it("handles flavor with internal hyphens", () => {
    // Los sabores reales no tienen números internos, pero el regex debe
    // mantenerlos como parte del flavor cuando aparecen
    const result = parsePulpaFilename("pulpa-maracuya-especial300.webp");
    expect(result).not.toBeNull();
    expect(result!.weight).toBe("300");
  });
});

// ── parseSkuFilename ─────────────────────────────────────────────────

describe("parseSkuFilename", () => {
  it("parses SKU_Limon1000V2.webp → { product: limon, volume: 1000 }", () => {
    expect(parseSkuFilename("SKU_Limon1000V2.webp")).toEqual({
      product: "limon",
      volume: "1000",
    });
  });

  it("parses SKU_Limon1000.webp without version", () => {
    expect(parseSkuFilename("SKU_Limon1000.webp")).toEqual({
      product: "limon",
      volume: "1000",
    });
  });

  it("returns null for non-SKU filename", () => {
    expect(parseSkuFilename("pulpa-maracuya300.webp")).toBeNull();
    expect(parseSkuFilename("logo.webp")).toBeNull();
  });
});

// ── parseProductFilename ─────────────────────────────────────────────

describe("parseProductFilename", () => {
  it("parses pulpa format", () => {
    const result = parseProductFilename("pulpa-maracuya300.webp");
    expect(result).toEqual<ParsedFile>({
      type: "pulpa",
      key: "pulpa-maracuya",
      weight: "300",
    });
  });

  it("parses SKU format", () => {
    const result = parseProductFilename("SKU_Limon1000V2.webp");
    expect(result).toEqual<ParsedFile>({
      type: "sku",
      key: "limon",
      weight: "1000",
    });
  });

  it("SKU limoncereza maps to limonada-cereza via SKU_ALIASES", () => {
    const result = parseProductFilename("SKU_LimonCereza500.webp");
    expect(result).toEqual<ParsedFile>({
      type: "sku",
      key: "limonada-cereza",
      weight: "500",
    });
  });

  it("returns null for unrecognized filename", () => {
    expect(parseProductFilename("random.webp")).toBeNull();
  });
});

// ── normalizePresentation ────────────────────────────────────────────

describe("normalizePresentation", () => {
  it("pulpa: 300 → 300g", () => {
    expect(normalizePresentation("300", "pulpa")).toBe("300g");
  });

  it("pulpa: 1000 → 1000g", () => {
    expect(normalizePresentation("1000", "pulpa")).toBe("1000g");
  });

  it("pulpa: 120 → 120g", () => {
    expect(normalizePresentation("120", "pulpa")).toBe("120g");
  });

  it("sku: 250 → 250ml", () => {
    expect(normalizePresentation("250", "sku")).toBe("250ml");
  });

  it("sku: 1000 → 1L", () => {
    expect(normalizePresentation("1000", "sku")).toBe("1L");
  });

  it("sku: 2000 → 2L", () => {
    expect(normalizePresentation("2000", "sku")).toBe("2L");
  });
});

// ── matchParsedFile ──────────────────────────────────────────────────

describe("matchParsedFile", () => {
  it("single match → type: single", () => {
    const parsed: ParsedFile = { type: "pulpa", key: "pulpa-maracuya", weight: "300" };
    const result = matchParsedFile(parsed, products);
    expect(result.type).toBe("single");
    if (result.type === "single") {
      expect(result.product.id).toBe("p1");
    }
  });

  it("match with existing image → still type: single (replace vs new se decide en UI)", () => {
    // p2 tiene image !== null. El matching no distingue replace/new.
    const parsed: ParsedFile = { type: "pulpa", key: "pulpa-maracuya", weight: "120" };
    const result = matchParsedFile(parsed, products);
    expect(result.type).toBe("single");
    if (result.type === "single") {
      expect(result.product.id).toBe("p2");
      expect(result.product.image).not.toBeNull();
    }
  });

  it("multiple candidates → type: multiple (ambiguous)", () => {
    // p7 + p8 comparten pulpa-mango / 120g
    const parsed: ParsedFile = { type: "pulpa", key: "pulpa-mango", weight: "120" };
    const result = matchParsedFile(parsed, products);
    expect(result.type).toBe("multiple");
    if (result.type === "multiple") {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates.map((c) => c.id)).toEqual(
        expect.arrayContaining(["p7", "p8"]),
      );
    }
  });

  it("no candidates → type: none", () => {
    // Sabor que no existe
    const parsed: ParsedFile = { type: "pulpa", key: "pulpa-nonexistent", weight: "300" };
    const result = matchParsedFile(parsed, products);
    expect(result.type).toBe("none");
    if (result.type === "none") {
      expect(result.reason).toContain("Sin producto");
    }
  });

  it("sku match → type: single with correct product", () => {
    const parsed: ParsedFile = { type: "sku", key: "limon", weight: "1000" };
    const result = matchParsedFile(parsed, products);
    expect(result.type).toBe("single");
    if (result.type === "single") {
      expect(result.product.id).toBe("p9");
    }
  });
});

// ── matchFileToProducts (full pipeline) ──────────────────────────────

describe("matchFileToProducts", () => {
  it("pulpa-maracuya300.webp → single match with file name", () => {
    const result = matchFileToProducts("pulpa-maracuya300.webp", products);
    expect(result.type).toBe("single");
    if (result.type === "single") {
      expect(result.file).toBe("pulpa-maracuya300.webp");
      expect(result.product.id).toBe("p1");
    }
  });

  it("unrecognized filename → type: none", () => {
    const result = matchFileToProducts("random-file.webp", products);
    expect(result.type).toBe("none");
    if (result.type === "none") {
      expect(result.reason).toBe("Nombre no reconocido");
      expect(result.file).toBe("random-file.webp");
    }
  });

  it("unrecognized filename without image extension → type: none", () => {
    const result = matchFileToProducts("datos.txt", products);
    expect(result.type).toBe("none");
  });
});

// ── isNonProductAsset ────────────────────────────────────────────────

describe("isNonProductAsset", () => {
  it("detects slides", () => {
    expect(isNonProductAsset("slide-01.webp")).toBe(true);
    expect(isNonProductAsset("SlidePrincipal.webp")).toBe(true);
  });

  it("detects logos", () => {
    expect(isNonProductAsset("logo.webp")).toBe(true);
    expect(isNonProductAsset("Logo-Nuevo.webp")).toBe(true);
  });

  it("detects portada in filename", () => {
    expect(isNonProductAsset("pulpaportada.webp")).toBe(true);
    expect(isNonProductAsset("portada-productos.webp")).toBe(true);
  });

  it("passes regular pulpa filenames", () => {
    expect(isNonProductAsset("pulpa-maracuya300.webp")).toBe(false);
    expect(isNonProductAsset("pulpa-fresa120.webp")).toBe(false);
  });

  it("passes SKU filenames", () => {
    expect(isNonProductAsset("SKU_Limon1000.webp")).toBe(false);
  });

  it("detects lacteos_ prefix", () => {
    expect(isNonProductAsset("lacteos_kumis.webp")).toBe(true);
  });

  it("detects quienesomos prefix", () => {
    expect(isNonProductAsset("quienesomos-equipo.webp")).toBe(true);
  });

  it("detects pulpasfrutas- prefix", () => {
    expect(isNonProductAsset("pulpasfrutas-collage.webp")).toBe(true);
  });

  it("detects naranja- prefix", () => {
    expect(isNonProductAsset("naranja-portada.webp")).toBe(true);
  });
});

// ── isSupportedImage ─────────────────────────────────────────────────

describe("isSupportedImage", () => {
  it("accepts webp, png, jpg, jpeg", () => {
    expect(isSupportedImage("image.webp")).toBe(true);
    expect(isSupportedImage("image.png")).toBe(true);
    expect(isSupportedImage("image.jpg")).toBe(true);
    expect(isSupportedImage("image.jpeg")).toBe(true);
  });

  it("rejects other extensions", () => {
    expect(isSupportedImage("image.gif")).toBe(false);
    expect(isSupportedImage("image.svg")).toBe(false);
    expect(isSupportedImage("image.txt")).toBe(false);
    expect(isSupportedImage("image")).toBe(false);
  });

  it("handles uppercase extensions", () => {
    expect(isSupportedImage("image.WEBP")).toBe(true);
    expect(isSupportedImage("image.PNG")).toBe(true);
  });
});

// ── groupResults ─────────────────────────────────────────────────────

describe("groupResults", () => {
  it("classifies single results as pending (no image) or existing (has image)", () => {
    const results: MatchResult[] = [
      { type: "single", product: products[0], file: "pulpa-maracuya300.webp" },   // image === null
      { type: "single", product: products[1], file: "pulpa-maracuya120.webp" },   // image !== null
    ];
    const group = groupResults(results, ["pulpa-maracuya300.webp", "pulpa-maracuya120.webp"]);
    expect(group.pending).toHaveLength(1);
    expect(group.pending[0].file).toBe("pulpa-maracuya300.webp");
    expect(group.existing).toHaveLength(1);
    expect(group.existing[0].file).toBe("pulpa-maracuya120.webp");
    expect(group.ambiguous).toHaveLength(0);
    expect(group.noMatch).toHaveLength(0);
    expect(group.skipped).toHaveLength(0);
    expect(group.unsupported).toHaveLength(0);
  });

  it("classifies multiple results as ambiguous", () => {
    const ambiguous: MatchResult = {
      type: "multiple",
      candidates: [products[6], products[7]],
      file: "pulpa-mango120.webp",
      reason: "2 productos",
    };
    const group = groupResults([ambiguous], ["pulpa-mango120.webp"]);
    expect(group.ambiguous).toHaveLength(1);
    expect(group.pending).toHaveLength(0);
    expect(group.existing).toHaveLength(0);
  });

  it("classifies none results as noMatch", () => {
    const noMatch: MatchResult = {
      type: "none",
      file: "random.webp",
      reason: "Nombre no reconocido",
    };
    const group = groupResults([noMatch], ["random.webp"]);
    expect(group.noMatch).toHaveLength(1);
  });

  it("identifies skipped (supported but unmatched) and unsupported files from allFiles", () => {
    const results: MatchResult[] = [];
    const allFiles = ["pulpa-maracuya300.webp", "datos.txt", "slide-01.webp"];
    const group = groupResults(results, allFiles);
    // pulpa-maracuya300.webp: supported, not in results → skipped
    expect(group.skipped).toContain("pulpa-maracuya300.webp");
    // datos.txt: unsupported
    expect(group.unsupported).toContain("datos.txt");
    // slide-01.webp: supported, not in results → skipped
    expect(group.skipped).toContain("slide-01.webp");
  });
});
