import type { Product } from "@/types";
import type { Dictionary } from "@/lib/i18n";

/**
 * Pure derivation of everything `ProductCard` needs to know about a product.
 *
 * The card previously computed nine flags and four class strings inline, which
 * put every one of those `||`/`??` decisions straight into the component's
 * cyclomatic complexity — the render function alone scored 37. Keeping the
 * derivation here makes it testable without a DOM and leaves the component
 * rendering plain, already-resolved values.
 */

// Degradados del packaging: mantienen identidad por fruta, pero con una base más suave.
const CARD_GRADIENTS: Record<string, string> = {
  "pulpa-mora": "from-[#eee5fb] via-[#b69ada] to-[#5e3f8e]",
  "pulpa-maracuya": "from-[#fff4c9] via-[#f2cf78] to-[#c8892e]",
  "pulpa-fresa": "from-[#ffe0ea] via-[#f39ab1] to-[#bf4a62]",
  "pulpa-mango": "from-[#fff1c7] via-[#f6be70] to-[#d98238]",
  "pulpa-guanabana": "from-[#eef7e8] via-[#b8d4ad] to-[#5b8567]",
  "pulpa-guayaba": "from-[#ffe4ea] via-[#f5b1bc] to-[#d57382]",
  "pulpa-lulo": "from-[#fff5c8] via-[#d9e874] to-[#d67d2f]",
  "pulpa-frutos-rojos": "from-[#ffe0e7] via-[#cf7a8e] to-[#882f4a]",
  "pulpa-frutos-amarillos": "from-[#fff3cf] via-[#f0d37e] to-[#de9b3c]",
  "pulpa-tomate-arbol": "from-[#ffe7cf] via-[#f3ae72] to-[#c85b43]",
};

const CARD_SHADOW_TINTS: Record<string, string> = {
  "pulpa-mora": "shadow-[0_18px_40px_rgba(94,63,142,0.22)] hover:shadow-[0_24px_52px_rgba(94,63,142,0.28)]",
  "pulpa-maracuya": "shadow-[0_18px_40px_rgba(200,137,46,0.22)] hover:shadow-[0_24px_52px_rgba(200,137,46,0.28)]",
  "pulpa-fresa": "shadow-[0_18px_40px_rgba(191,74,98,0.20)] hover:shadow-[0_24px_52px_rgba(191,74,98,0.26)]",
  "pulpa-mango": "shadow-[0_18px_40px_rgba(217,130,56,0.20)] hover:shadow-[0_24px_52px_rgba(217,130,56,0.26)]",
  "pulpa-guanabana": "shadow-[0_18px_40px_rgba(91,133,103,0.20)] hover:shadow-[0_24px_52px_rgba(91,133,103,0.26)]",
  "pulpa-guayaba": "shadow-[0_18px_40px_rgba(213,115,130,0.20)] hover:shadow-[0_24px_52px_rgba(213,115,130,0.26)]",
  "pulpa-lulo": "shadow-[0_18px_40px_rgba(214,125,47,0.22)] hover:shadow-[0_24px_52px_rgba(214,125,47,0.28)]",
  "pulpa-frutos-rojos": "shadow-[0_18px_40px_rgba(136,47,74,0.22)] hover:shadow-[0_24px_52px_rgba(136,47,74,0.28)]",
  "pulpa-frutos-amarillos": "shadow-[0_18px_40px_rgba(222,155,60,0.22)] hover:shadow-[0_24px_52px_rgba(222,155,60,0.28)]",
  "pulpa-tomate-arbol": "shadow-[0_18px_40px_rgba(200,91,67,0.20)] hover:shadow-[0_24px_52px_rgba(200,91,67,0.26)]",
};

const FALLBACK_SHADOW_TINT = "shadow-md hover:shadow-xl hover:shadow-primary/8";

/** Packaging cards sit on a white-washed panel; field photos do not. */
const PACKAGING_PANEL_CLASSES =
  "border-white/70 shadow-[0_16px_36px_rgba(15,23,42,0.10)] hover:shadow-[0_22px_48px_rgba(15,23,42,0.16)]";

export type ProductCardView = {
  readonly imageSrc: string;
  readonly alt: string;
  readonly presentation: string;
  readonly comingSoonLabel: string;
  readonly isComingSoon: boolean;
  readonly isSoldOut: boolean;
  readonly isBestSeller: boolean;
  readonly isDairyProduct: boolean;
  readonly isKumissProduct: boolean;
  readonly hasPackagingImage: boolean;
  readonly isProductShot: boolean;
  readonly displayName: string;
  readonly displayDescription: string;
  readonly cardGradient: string;
  /** Prop-supplied fallback gradient, used by the badge and placeholder. */
  readonly accentGradient: string;
  readonly baseCardClasses: string;
};

export function describeProductCard(
  product: Product,
  dict: Dictionary,
  lang: string,
  accentGradient: string
): ProductCardView {
  const imageSrc = product.image ?? "";
  const line = product.line;
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[line]?.label ?? product.name;

  const isDairyProduct = line.startsWith("kumis") || line.startsWith("yogurt");
  // Tratamiento nuevo solo para productos con imagen de packaging (no las fotos de campo fruta-*.webp)
  const hasPackagingImage =
    line.startsWith("pulpa-") && imageSrc !== "" && !imageSrc.includes("/imgs/fruta-");

  const cardGradient = CARD_GRADIENTS[line] ?? accentGradient;
  const cardShadowTint = CARD_SHADOW_TINTS[line] ?? FALLBACK_SHADOW_TINT;

  return {
    imageSrc,
    // alt: displayName comes from i18n dict; presentation (e.g. "120g") is a
    // universal technical value — no translation needed.
    alt: `${displayName} ${product.presentation}`,
    presentation: product.presentation,
    comingSoonLabel: dict.products.card.comingSoon,
    isComingSoon: product.presentation === "Próximamente",
    isSoldOut: product.isSoldOut === true,
    isBestSeller: product.isBestSeller === true,
    isDairyProduct,
    isKumissProduct: line.startsWith("kumis"),
    hasPackagingImage,
    // Productos que necesitan overlays suaves (sin gradiente oscuro inferior)
    isProductShot: hasPackagingImage || isDairyProduct,
    displayName,
    displayDescription:
      lang !== "es" ? (pl[line]?.description ?? product.description) : product.description,
    cardGradient,
    accentGradient,
    baseCardClasses: hasPackagingImage
      ? `border-white/70 ${cardShadowTint}`
      : PACKAGING_PANEL_CLASSES,
  };
}
