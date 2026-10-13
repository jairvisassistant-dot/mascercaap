"use client";

import { useState } from "react";
import Image from "next/image";

import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Product } from "@/types";
import type { Dictionary } from "@/lib/i18n";
import { describeProductCard, type ProductCardView } from "@/lib/product-card-view";
import ProductLightbox from "./ProductLightbox";

interface ProductCardProps {
  product: Product;
  accentGradient?: string;
  priority?: boolean;
  dict: Dictionary;
  lang: string;
}

/**
 * Product card.
 *
 * Every product-derived value comes from `describeProductCard`, and the render
 * is split into one component per visual region. The previous single function
 * scored 37 cyclomatic / 42 cognitive complexity with four levels of nesting —
 * it interleaved nine product flags with the media, badge and copy markup, so a
 * change to one badge meant re-reading (and re-risking) the whole card.
 */

export default function ProductCard({
  product,
  accentGradient = "from-primary to-primary-dark",
  priority = false,
  dict,
  lang,
}: ProductCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const view = describeProductCard(product, dict, lang, accentGradient);

  return (
    <div
      className={`card-shimmer group relative shrink-0 w-[234px] overflow-hidden rounded-[1.35rem] border bg-surface-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 ${
        view.baseCardClasses
      }`}
    >
      <ProductCardGlow view={view} />

      <ProductCardMedia
        view={view}
        dict={dict}
        priority={priority}
        onOpenLightbox={() => setLightboxOpen(true)}
      />

      {/* Borde de color que conecta imagen con info — solo para packaging */}
      {view.hasPackagingImage && (
        <div
          className={`relative h-[4px] overflow-hidden bg-gradient-to-r ${view.cardGradient} opacity-75`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.45)_48%,rgba(255,255,255,0)_100%)]" />
        </div>
      )}

      <ProductCardInfo view={view} />

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

/** Inner ring plus the soft colour halo that bleeds above the card. */
function ProductCardGlow({ view }: { readonly view: ProductCardView }) {
  if (!view.hasPackagingImage && view.imageSrc === "") return null;

  return (
    <>
      <div className="pointer-events-none absolute inset-[1px] z-[1] rounded-[1.28rem] border border-white/35" />
      <div
        className={`pointer-events-none absolute inset-x-6 -top-10 z-[1] h-20 rounded-full bg-gradient-to-r blur-2xl transition-opacity duration-300 ${view.cardGradient} ${
          view.isProductShot
            ? "opacity-20 group-hover:opacity-30"
            : "opacity-10 group-hover:opacity-20"
        }`}
      />
    </>
  );
}

/**
 * The image stage: backdrop, overlays, the zoom trigger and the badges.
 * Split from the card so the media-only concerns (spotlight, gradients,
 * overlay stacking) can evolve without touching copy or purchase info.
 */
function ProductCardMedia({
  view,
  dict,
  priority,
  onOpenLightbox,
}: {
  readonly view: ProductCardView;
  readonly dict: Dictionary;
  readonly priority: boolean;
  readonly onOpenLightbox: () => void;
}) {
  const backdropClasses = view.isDairyProduct
    ? "bg-white"
    : view.hasPackagingImage
      ? `bg-gradient-to-b ${view.cardGradient}`
      : "bg-surface-page";

  return (
    <div className={`relative h-60 ${backdropClasses}`}>
      {(view.hasPackagingImage || view.imageSrc !== "") && (
        <>
          <div
            className={`pointer-events-none absolute inset-0 z-[1] ${
              view.isProductShot
                ? "bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.12)_24%,transparent_58%)]"
                : "bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_22%,transparent_55%)]"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] ${
              view.isProductShot
                ? "h-24 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.18)_0%,transparent_68%)]"
                : "h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.14)_100%)]"
            }`}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_28%,rgba(0,0,0,0.06)_100%)]" />
        </>
      )}

      {view.imageSrc !== "" && !view.isComingSoon && (
        <button
          type="button"
          onClick={onOpenLightbox}
          className="absolute inset-0 z-[5] w-full h-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          aria-label={`${dict.products.card.viewImage} ${view.alt}`}
        >
          <span className="pointer-events-none absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/40 text-white">
            <svg
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h6M11 8v6" />
            </svg>
          </span>
        </button>
      )}

      <ProductCardImage view={view} priority={priority} />

      {/* Spotlight desde arriba — ilumina el producto sin oscurecer bordes */}
      {view.hasPackagingImage && (
        <div className="absolute inset-0 z-[3] pointer-events-none bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.22)_0%,transparent_65%)]" />
      )}

      <ProductCardBadges view={view} dict={dict} />
    </div>
  );
}

/**
 * Packaging and dairy shots are centred, contained and softly padded; field
 * photos cover the whole stage. Products without any image get the "coming
 * soon" placeholder instead.
 */
function ProductCardImage({
  view,
  priority,
}: {
  readonly view: ProductCardView;
  readonly priority: boolean;
}) {
  if (view.imageSrc === "") {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br ${view.accentGradient} flex flex-col items-center justify-center gap-2`}
      >
        <EmojiIcon
          emoji="🔜"
          label={view.comingSoonLabel}
          size="xl"
          tone="fruit"
          decorative={false}
        />
        <span className="text-white text-sm font-semibold">{view.comingSoonLabel}</span>
      </div>
    );
  }

  if (!view.hasPackagingImage && !view.isDairyProduct) {
    return (
      <Image
        src={view.imageSrc}
        alt={view.alt}
        fill
        className="transition-transform duration-500 group-hover:scale-[1.04] object-cover"
        sizes="208px"
        priority={priority}
      />
    );
  }

  const padding = view.isKumissProduct ? "p-10" : view.isDairyProduct ? "p-5" : "p-3";

  return (
    <div
      className={`absolute inset-0 z-[2] flex items-center justify-center pointer-events-none ${padding}`}
    >
      <div className="relative h-full w-full transition-transform duration-300 group-hover:scale-[1.02] group-hover:-translate-y-0.5">
        <Image
          src={view.imageSrc}
          alt={view.alt}
          fill
          className={`object-contain object-center${
            view.hasPackagingImage ? " drop-shadow-[0_20px_28px_rgba(0,0,0,0.24)]" : ""
          }`}
          sizes="208px"
          priority={priority}
        />
      </div>
    </div>
  );
}

/** Presentation, sold-out and best-seller overlays. */
function ProductCardBadges({
  view,
  dict,
}: {
  readonly view: ProductCardView;
  readonly dict: Dictionary;
}) {
  return (
    <>
      {!view.isComingSoon && (
        <span
          className={`absolute top-3 right-3 ${
            view.imageSrc !== ""
              ? "border border-white/60 bg-white/88 text-gray-700 shadow-[0_8px_20px_rgba(255,255,255,0.22)] backdrop-blur-md"
              : `bg-gradient-to-r ${view.accentGradient} text-white`
          } z-10 rounded-full px-2.5 py-1 text-xs font-bold shadow`}
        >
          {view.presentation}
        </span>
      )}

      {view.isSoldOut && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <span className="bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full tracking-widest uppercase shadow-lg">
            {dict.products.card.soldOut}
          </span>
        </div>
      )}

      {/* Ink on the accent badge: white on #e58a22 is 2.62:1, below the 4.5:1
          AA minimum for 12px bold — matches the home page's own badge. */}
      {view.isBestSeller && !view.isSoldOut && (
        <span className="absolute top-3 left-3 bg-[var(--color-accent,#e58a22)] text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow z-10 uppercase tracking-wide">
          {dict.products.card.bestSeller}
        </span>
      )}
    </>
  );
}

/** Title and description block. */
function ProductCardInfo({ view }: { readonly view: ProductCardView }) {
  const infoBackground = view.hasPackagingImage
    ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.96)_22%,#ffffff_100%)]"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,#ffffff_100%)]";

  return (
    <div className={`relative px-4 pb-4 pt-4.5 ${infoBackground}`}>
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/90" />
      <div className="space-y-1.5">
        <h3 className="line-clamp-1 text-[0.98rem] font-semibold leading-tight tracking-[-0.018em] text-text-main text-balance">
          {view.displayName}
        </h3>
        <p className="min-h-[2.55rem] line-clamp-2 text-[0.78rem] leading-[1.6] text-text-muted text-pretty">
          {view.displayDescription}
        </p>
      </div>
    </div>
  );
}
