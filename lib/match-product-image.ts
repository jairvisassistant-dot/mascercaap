// ─────────────────────────────────────────────────────────────────────────
// Lógica compartida de matching filename → producto
// Fase 1: pulpas (pattern: pulpa-{sabor}{peso}.webp) — extensible a SKU
// ─────────────────────────────────────────────────────────────────────────

export type ProductBrief = {
  id: string;
  line: string;
  presentation: string;
  image: string | null;
};

export type MatchResult =
  | { type: "single"; product: ProductBrief; file: string }
  | { type: "multiple"; candidates: ProductBrief[]; file: string; reason: string }
  | { type: "none"; file: string; reason: string };

/** Extensiones de imagen soportadas */
const IMAGE_EXTS = new Set(["webp", "png", "jpg", "jpeg"]);

/** Prefijos de archivos que NO son imágenes de producto */
const NON_PRODUCT_PREFIXES = [
  "slide", "logo", "lacteos_", "quienesomos",
  "pulpaportada", "pulpasfrutas-", "naranja-",
];

/** SKU alias map: nombre en filename → line key en DB */
const SKU_ALIASES: Record<string, string> = {
  limoncereza: "limonada-cereza",
  limoncoco: "limonada-coco",
  limon: "limon",
  maracuya: "maracuya",
};

// ── Filtros ────────────────────────────────────────────────────────

export function isSupportedImage(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXTS.has(ext) : false;
}

export function isNonProductAsset(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (NON_PRODUCT_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (lower.includes("portada")) return true;
  return false;
}

// ── Parseo de nombre de archivo ────────────────────────────────────

/**
 * Parsea archivos tipo `pulpa-maracuya300.webp`
 * Devuelve flavor (ej. "maracuya") y weight (ej. "300").
 */
export function parsePulpaFilename(
  filename: string,
): { flavor: string; weight: string } | null {
  const name = filename.replace(/\.[^.]+$/, "").toLowerCase();
  // Los pesos pueden ser 3 dígitos (120, 300) o 4 (1000).
  // Usamos (\d{3,4}) al final, junto con lazy .+? para evitar
  // que "fresa1" capture "1" del "1000".
  // La posición del peso se determina greedy: (\d{3,4}) toma
  // la última secuencia de 3-4 dígitos antes del final.
  const match = name.match(/^pulpa-(.+?)(\d{3,4})(?:g)?(?:v\d+)?$/);
  if (!match) return null;
  return { flavor: match[1], weight: match[2] };
}

/**
 * Parsea archivos tipo `SKU_Limon1000V2.webp`
 * Devuelve product (ej. "limon") y volume (ej. "1000").
 */
export function parseSkuFilename(
  filename: string,
): { product: string; volume: string } | null {
  const name = filename.replace(/\.[^.]+$/, "").toLowerCase();
  // SKU_ProductoVolumen[V2][...]
  const match = name.match(/^sku_(.+?)(\d{3,4})(?:v\d+)?$/);
  if (!match) return null;
  return { product: match[1], volume: match[2] };
}

/**
 * Parseo genérico por ahora: prueba todos los patrones conocidos.
 */
export type ParsedFile = {
  type: "pulpa" | "sku";
  key: string; // línea de producto normalizada (ej. "pulpa-maracuya")
  weight: string; // presentación numérica (ej. "300")
};

export function parseProductFilename(filename: string): ParsedFile | null {
  const pulpa = parsePulpaFilename(filename);
  if (pulpa) {
    return {
      type: "pulpa",
      key: `pulpa-${pulpa.flavor}`,
      weight: pulpa.weight,
    };
  }

  const sku = parseSkuFilename(filename);
  if (sku) {
    return {
      type: "sku",
      key: SKU_ALIASES[sku.product] ?? sku.product,
      weight: sku.volume,
    };
  }

  return null;
}

// ── Matching ───────────────────────────────────────────────────────

/**
 * Normaliza una presentación numérica al formato usado en DB.
 * Ej: "300" → "300g", "1000" → "1000g", "600" → "600ml"
 *
 * Para Fase 1 asumimos g para pulpas.
 */
export function normalizePresentation(
  weight: string,
  type: "pulpa" | "sku",
): string {
  if (type === "pulpa") return `${weight}g`;

  // SKU: mapeo volumen → ml / L
  const v = parseInt(weight, 10);
  if (v >= 1000) return `${v / 1000}L`.replace(".0", "");
  return `${v}ml`;
}

/**
 * Matches a parsed file against the product list.
 */
export function matchParsedFile(
  parsed: ParsedFile,
  products: ProductBrief[],
): MatchResult {
  const presentation = normalizePresentation(parsed.weight, parsed.type);

  const candidates = products.filter(
    (p) => p.line === parsed.key && p.presentation === presentation,
  );

  if (candidates.length === 1) {
    return { type: "single", product: candidates[0], file: "" };
  }

  if (candidates.length > 1) {
    return {
      type: "multiple",
      candidates,
      file: "",
      reason: `${candidates.length} productos para line="${parsed.key}" presentation="${presentation}"`,
    };
  }

  return {
    type: "none",
    file: "",
    reason: `Sin producto: line="${parsed.key}" presentation="${presentation}"`,
  };
}

/**
 * Entry-point: filename + products → MatchResult
 */
export function matchFileToProducts(
  filename: string,
  products: ProductBrief[],
): MatchResult {
  const parsed = parseProductFilename(filename);
  if (!parsed) {
    return { type: "none", file: filename, reason: "Nombre no reconocido" };
  }

  const result = matchParsedFile(parsed, products);
  return { ...result, file: filename };
}

// ── Agrupación util para reportes ──────────────────────────────────

type MatchGroup = {
  pending: { file: string; product: ProductBrief }[];   // match exacto y image === null
  existing: { file: string; product: ProductBrief }[];   // match exacto pero ya tiene imagen
  ambiguous: MatchResult[];                              // múltiples candidatos
  noMatch: MatchResult[];                                 // sin coincidencia
  skipped: string[];                                      // archivos no-producto
  unsupported: string[];                                  // extension no soportada
};

export function groupResults(
  results: MatchResult[],
  allFiles: string[],
): MatchGroup {
  const group: MatchGroup = {
    pending: [],
    existing: [],
    ambiguous: [],
    noMatch: [],
    skipped: [],
    unsupported: [],
  };

  for (const r of results) {
    if (r.type === "single") {
      if (r.product.image === null) {
        group.pending.push({ file: r.file, product: r.product });
      } else {
        group.existing.push({ file: r.file, product: r.product });
      }
    } else if (r.type === "multiple") {
      group.ambiguous.push(r);
    } else {
      group.noMatch.push(r);
    }
  }

  // Determine skipped/unsupported from original file list
  const matchedFiles = new Set(results.map((r) => r.file));
  for (const f of allFiles) {
    if (matchedFiles.has(f)) continue;
    if (isSupportedImage(f)) {
      group.skipped.push(f);
    } else {
      group.unsupported.push(f);
    }
  }

  return group;
}
