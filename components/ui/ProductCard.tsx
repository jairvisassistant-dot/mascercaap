"use client";

import { useState } from "react";
import Image from "next/image";
import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Product } from "@/types";
import type { Dictionary } from "@/lib/i18n";
import ProductLightbox from "./ProductLightbox";

interface ProductCardProps {
  product: Product;
  accentGradient?: string;
  priority?: boolean;
  dict: Dictionary;
  lang: string;
}

// Degradados del packaging: mantienen identidad por fruta, pero con una base más suave.
const CARD_GRADIENTS: Record<string, string> = {
  "pulpa-mora":              "from-[#eee5fb] via-[#b69ada] to-[#5e3f8e]",
  "pulpa-maracuya":          "from-[#fff4c9] via-[#f2cf78] to-[#c8892e]",
  "pulpa-fresa":             "from-[#ffe0ea] via-[#f39ab1] to-[#bf4a62]",
  "pulpa-mango":             "from-[#fff1c7] via-[#f6be70] to-[#d98238]",
  "pulpa-guanabana":         "from-[#eef7e8] via-[#b8d4ad] to-[#5b8567]",
  "pulpa-guayaba":           "from-[#ffe4ea] via-[#f5b1bc] to-[#d57382]",
  "pulpa-lulo":              "from-[#fff5c8] via-[#d9e874] to-[#d67d2f]",
  "pulpa-frutos-rojos":      "from-[#ffe0e7] via-[#cf7a8e] to-[#882f4a]",
  "pulpa-frutos-amarillos":  "from-[#fff3cf] via-[#f0d37e] to-[#de9b3c]",
  "pulpa-tomate-arbol":      "from-[#ffe7cf] via-[#f3ae72] to-[#c85b43]",
};
const CARD_SHADOW_TINTS: Record<string, string> = {
  "pulpa-mora":             "shadow-[0_18px_40px_rgba(94,63,142,0.22)] hover:shadow-[0_24px_52px_rgba(94,63,142,0.28)]",
  "pulpa-maracuya":         "shadow-[0_18px_40px_rgba(200,137,46,0.22)] hover:shadow-[0_24px_52px_rgba(200,137,46,0.28)]",
  "pulpa-fresa":            "shadow-[0_18px_40px_rgba(191,74,98,0.20)] hover:shadow-[0_24px_52px_rgba(191,74,98,0.26)]",
  "pulpa-mango":            "shadow-[0_18px_40px_rgba(217,130,56,0.20)] hover:shadow-[0_24px_52px_rgba(217,130,56,0.26)]",
  "pulpa-guanabana":        "shadow-[0_18px_40px_rgba(91,133,103,0.20)] hover:shadow-[0_24px_52px_rgba(91,133,103,0.26)]",
  "pulpa-guayaba":          "shadow-[0_18px_40px_rgba(213,115,130,0.20)] hover:shadow-[0_24px_52px_rgba(213,115,130,0.26)]",
  "pulpa-lulo":             "shadow-[0_18px_40px_rgba(214,125,47,0.22)] hover:shadow-[0_24px_52px_rgba(214,125,47,0.28)]",
  "pulpa-frutos-rojos":     "shadow-[0_18px_40px_rgba(136,47,74,0.22)] hover:shadow-[0_24px_52px_rgba(136,47,74,0.28)]",
  "pulpa-frutos-amarillos": "shadow-[0_18px_40px_rgba(222,155,60,0.22)] hover:shadow-[0_24px_52px_rgba(222,155,60,0.28)]",
  "pulpa-tomate-arbol":     "shadow-[0_18px_40px_rgba(200,91,67,0.20)] hover:shadow-[0_24px_52px_rgba(200,91,67,0.26)]",
};

export default function ProductCard({ product, accentGradient = "from-primary to-primary-dark", priority = false, dict, lang }: ProductCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isComingSoon = product.presentation === "Próximamente";
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[product.line]?.label ?? product.name;
  const displayDescription = lang !== "es" ? (pl[product.line]?.description ?? product.description) : product.description;
  const isSoldOut = product.isSoldOut === true;
  const isBestSeller = product.isBestSeller === true;
  const isDairyProduct = product.line === "kumiss";
  // Tratamiento nuevo solo para productos con imagen de packaging (no las fotos de campo fruta-*.webp)
  const hasPackagingImage = product.line.startsWith("pulpa-") && !product.image.includes("/imgs/fruta-");

  const cardGradient = CARD_GRADIENTS[product.line] ?? accentGradient;
  const cardShadowTint = CARD_SHADOW_TINTS[product.line] ?? "shadow-md hover:shadow-xl hover:shadow-primary/8";
  const baseCardClasses = hasPackagingImage
    ? `border-white/70 ${cardShadowTint}`
    : "border-white/70 shadow-[0_16px_36px_rgba(15,23,42,0.10)] hover:shadow-[0_22px_48px_rgba(15,23,42,0.16)]";

  return (
    <div className={`card-shimmer group relative shrink-0 w-[234px] overflow-hidden rounded-[1.35rem] border bg-surface-card transition-all duration-300 hover:-translate-y-1 ${
      baseCardClasses
    }`}>
      {(hasPackagingImage || product.image) && (
        <>
          <div className="pointer-events-none absolute inset-[1px] z-[1] rounded-[1.28rem] border border-white/35" />
          <div className={`pointer-events-none absolute inset-x-6 -top-10 z-[1] h-20 rounded-full bg-gradient-to-r blur-2xl transition-opacity duration-300 ${cardGradient} ${
            hasPackagingImage ? "opacity-20 group-hover:opacity-30" : "opacity-10 group-hover:opacity-20"
          }`} />
        </>
      )}

      {/* Imagen */}
      <div className={`relative h-60 ${
        isDairyProduct
          ? "bg-white"
          : hasPackagingImage
            ? `bg-gradient-to-b ${cardGradient}`
            : "bg-surface-page"
      }`}>
        {(hasPackagingImage || product.image) && (
          <>
            <div className={`pointer-events-none absolute inset-0 z-[1] ${hasPackagingImage ? "bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.12)_24%,transparent_58%)]" : "bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_22%,transparent_55%)]"}`} />
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] ${hasPackagingImage ? "h-24 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.18)_0%,transparent_68%)]" : "h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.14)_100%)]"}`} />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_28%,rgba(0,0,0,0.06)_100%)]" />
          </>
        )}

        {product.image && !isComingSoon && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0 z-[5] w-full h-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
            aria-label={`${dict.products.card.viewImage} ${displayName} ${product.presentation}`}
          >
            <span className="pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h6M11 8v6" />
              </svg>
            </span>
          </button>
        )}

        {product.image ? (
          hasPackagingImage ? (
            <div className="absolute inset-0 z-[2] flex items-center justify-center p-3 pointer-events-none">
              <div className="relative h-full w-full transition-transform duration-300 group-hover:scale-[1.02] group-hover:-translate-y-0.5">
                {/* alt: displayName comes from i18n dict; presentation (e.g. "120g") is a universal technical value — no translation needed */}
                <Image
                  src={product.image}
                  alt={`${displayName} ${product.presentation}`}
                  fill
                  className="object-contain object-center drop-shadow-[0_20px_28px_rgba(0,0,0,0.24)]"
                  sizes="208px"
                  priority={priority}
                />
              </div>
            </div>
          ) : (
            // alt: displayName from i18n dict; presentation is a universal technical value
            <Image
              src={product.image}
              alt={`${displayName} ${product.presentation}`}
              fill
                className={`transition-transform duration-500 group-hover:scale-[1.04] ${isDairyProduct ? "object-contain object-center p-3" : "object-cover"}`}
                sizes="208px"
                priority={priority}
              />
          )
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${accentGradient} flex flex-col items-center justify-center gap-2`}>
            <EmojiIcon emoji="🔜" label={dict.products.card.comingSoon} size="xl" tone="fruit" decorative={false} />
            <span className="text-white text-sm font-semibold">{dict.products.card.comingSoon}</span>
          </div>
        )}

        {/* Spotlight desde arriba — ilumina el producto sin oscurecer bordes */}
        {hasPackagingImage && (
          <div className="absolute inset-0 z-[3] pointer-events-none bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.22)_0%,transparent_65%)]" />
        )}

        {!isComingSoon && (
          <span className={`absolute top-3 right-3 ${
            product.image
              ? "border border-white/60 bg-white/88 text-gray-700 shadow-[0_8px_20px_rgba(255,255,255,0.22)] backdrop-blur-md"
              : `bg-gradient-to-r ${accentGradient} text-white`
          } z-10 rounded-full px-2.5 py-1 text-xs font-bold shadow`}>
            {product.presentation}
          </span>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <span className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full tracking-widest uppercase shadow-lg">
              {dict.products.card.soldOut}
            </span>
          </div>
        )}

        {isBestSeller && !isSoldOut && (
          <span className="absolute top-3 left-3 bg-[var(--color-accent,#e58a22)] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow z-10 uppercase tracking-wide">
            {dict.products.card.bestSeller}
          </span>
        )}
      </div>

      {/* Borde de color que conecta imagen con info — solo para packaging */}
      {hasPackagingImage && (
        <div className={`relative h-[4px] overflow-hidden bg-gradient-to-r ${cardGradient} opacity-75`}>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.45)_48%,rgba(255,255,255,0)_100%)]" />
        </div>
      )}

      {/* Info base */}
      <div className={`relative px-4 pb-4 pt-4.5 ${hasPackagingImage ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.96)_22%,#ffffff_100%)]" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,#ffffff_100%)]"}`}>
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/90" />
        <div className="space-y-1.5">
          <h3 className="line-clamp-1 text-[0.98rem] font-semibold leading-tight tracking-[-0.018em] text-text-main text-balance">
            {displayName}
          </h3>
          <p className="min-h-[2.55rem] line-clamp-2 text-[0.78rem] leading-[1.6] text-text-muted text-pretty">
            {displayDescription}
          </p>
        </div>
      </div>

      <ProductLightbox
        product={product}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        dict={dict}
        lang={lang}
      />
    </div>
  );
}
