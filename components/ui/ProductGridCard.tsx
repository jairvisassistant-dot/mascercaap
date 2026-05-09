"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Product, ProductLineConfig } from "@/types";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

const ProductLightbox = dynamic(() => import("./ProductLightbox"), { ssr: false });

interface ProductGridCardProps {
  product: Product;
  line: ProductLineConfig;
  priority?: boolean;
}

const CARD_GRADIENTS: Record<string, string> = {
  "pulpa-guanabana": "from-green-950 via-emerald-900 to-green-900",
  "pulpa-guayaba":   "from-fuchsia-950 via-pink-900 to-rose-950",
};

export default function ProductGridCard({ product, line, priority = false }: ProductGridCardProps) {
  const { dict, lang } = useDictionary();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isComingSoon = product.presentation === "Próximamente";
  const isSoldOut = product.isSoldOut === true;
  const isBestSeller = product.isBestSeller === true;
  const isDairyProduct = product.line === "kumiss";
  const hasPackagingImage = product.line.startsWith("pulpa-") && !product.image.includes("/imgs/fruta-");
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[product.line]?.label ?? product.name;
  const displayDescription = lang !== "es" ? (pl[product.line]?.description ?? product.description) : product.description;
  const cardGradient = CARD_GRADIENTS[product.line] ?? line.gradient;
  const displayLineLabel = line.label.replace(/^Pulpa de\s+/i, "");

  return (
    <>
      <button
        type="button"
        disabled={isComingSoon}
        className="group relative w-full overflow-hidden rounded-[1.4rem] border border-white/70 bg-surface-card text-left shadow-[0_16px_36px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.16)] disabled:pointer-events-none"
        onClick={() => setLightboxOpen(true)}
      >
        {product.image && (
          <>
            <div className="pointer-events-none absolute inset-[1px] z-[1] rounded-[1.32rem] border border-white/35" />
            <div className={`pointer-events-none absolute inset-x-5 -top-8 z-[1] h-16 rounded-full bg-gradient-to-r blur-2xl transition-opacity duration-300 ${cardGradient} opacity-10 group-hover:opacity-20`} />
          </>
        )}

        {/* Imagen */}
        <div className={`relative aspect-[4/5] ${isDairyProduct ? "bg-white" : hasPackagingImage ? `bg-gradient-to-b ${cardGradient}` : "bg-surface-page"}`}>
          {product.image && (
            <>
              <div className={`pointer-events-none absolute inset-0 z-[1] ${hasPackagingImage ? "bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.10)_24%,transparent_58%)]" : "bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_22%,transparent_55%)]"}`} />
              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1] ${hasPackagingImage ? "h-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.16)_0%,transparent_68%)]" : "h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.14)_100%)]"}`} />
            </>
          )}

          {product.image ? (
            <Image
              src={product.image}
              alt={`${displayName} ${product.presentation}`}
              fill
              className={`transition-transform duration-500 group-hover:scale-105 ${
                isDairyProduct
                  ? "object-contain object-center p-4"
                  : hasPackagingImage
                    ? "object-contain object-center drop-shadow-[0_18px_26px_rgba(0,0,0,0.24)] p-3"
                    : "object-cover"
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              priority={priority}
            />
          ) : (
            <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${line.gradient}`}>
              <EmojiIcon emoji="🔜" label={dict.products.card.comingSoon} size="lg" tone="fruit" decorative={false} />
              <span className="text-xs font-semibold text-white">{dict.products.card.comingSoon}</span>
            </div>
          )}

          {/* Tamaño badge */}
          {!isComingSoon && (
            <span className="absolute top-2.5 right-2.5 z-10 rounded-full border border-white/60 bg-white/88 px-2.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-[0_8px_20px_rgba(255,255,255,0.22)] backdrop-blur-md">
              {product.presentation}
            </span>
          )}

          {/* Best seller badge */}
          {isBestSeller && !isSoldOut && (
            <span className="absolute top-2.5 left-2.5 z-10 rounded-full bg-[var(--color-accent,#e58a22)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              {dict.products.card.bestSeller}
            </span>
          )}

          {/* Sold out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                {dict.products.card.soldOut}
              </span>
            </div>
          )}

          {/* Gradient overlay en hover para el zoom icon */}
          {!isComingSoon && !isSoldOut && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="scale-75 rounded-full bg-surface-card/90 p-2 opacity-0 shadow-lg transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                <svg className="h-4 w-4 text-text-sub" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="relative bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,#ffffff_100%)] px-3.5 pb-3.5 pt-3">
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/90" />
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-page/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
            <span className="text-[11px] leading-none">{line.iconEmoji}</span>
            <span>{displayLineLabel}</span>
          </div>

          <p className="line-clamp-1 text-[0.95rem] font-semibold leading-tight tracking-[-0.018em] text-text-main text-balance">
            {displayName}
          </p>
          <p className="mt-1 min-h-[2.45rem] line-clamp-2 text-[0.76rem] leading-[1.6] text-text-muted text-pretty">
            {displayDescription}
          </p>

          {product.price != null && (
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="whitespace-nowrap text-[1.02rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-primary">
                ${product.price.toLocaleString("es-CO")}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                {product.presentation}
              </span>
            </div>
          )}
        </div>
      </button>

      <ProductLightbox
        product={product}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
