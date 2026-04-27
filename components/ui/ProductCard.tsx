"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { Product } from "@/types";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

const ProductLightbox = dynamic(() => import("./ProductLightbox"), { ssr: false });

interface ProductCardProps {
  product: Product;
  accentGradient?: string;
  priority?: boolean;
}

export default function ProductCard({ product, accentGradient = "from-primary to-primary-dark", priority = false }: ProductCardProps) {
  const { dict, lang } = useDictionary();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isComingSoon = product.presentation === "Próximamente";
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[product.line]?.label ?? product.name;
  const displayDescription = lang !== "es" ? (pl[product.line]?.description ?? product.description) : product.description;
  const isSoldOut = product.isSoldOut === true;
  const isBestSeller = product.isBestSeller === true;
  // Tratamiento nuevo solo para productos con imagen de packaging (no las fotos de campo fruta-*.webp)
  const hasPackagingImage = product.line.startsWith("pulpa-") && !product.image.includes("/imgs/fruta-");

  // Degradados ricos para fondo de card — más dramáticos que los de badges/iconos
  const CARD_GRADIENTS: Record<string, string> = {
    "pulpa-mora":          "from-purple-300 via-purple-500 to-violet-800",
    "pulpa-maracuya":      "from-yellow-200 via-amber-400 to-amber-700",
    "pulpa-fresa":         "from-rose-200 via-rose-500 to-red-700",
    "pulpa-mango":         "from-yellow-300 via-amber-400 to-orange-500",
    "pulpa-guanabana":     "from-emerald-200 via-green-400 to-green-700",
    "pulpa-lulo":          "from-yellow-300 via-lime-400 to-orange-500",
    "pulpa-guayaba":       "from-pink-200 via-pink-400 to-rose-700",
    "pulpa-frutos-rojos":  "from-rose-300 via-red-500 to-red-800",
    "pulpa-tomate-arbol":  "from-orange-200 via-orange-500 to-red-700",
  };
  const cardGradient = CARD_GRADIENTS[product.line] ?? accentGradient;

  return (
    <div className="card-shimmer relative shrink-0 w-[234px] rounded-2xl overflow-hidden border border-gray-200 shadow-md hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300 bg-white">
      {/* Imagen */}
      <div className={`relative h-60 ${
        product.line === "kumiss"
          ? "bg-white"
          : hasPackagingImage
            ? `bg-gradient-to-b ${cardGradient}`
            : "bg-gray-100"
      }`}>
        {product.image && !isComingSoon && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0 z-[5] w-full h-full cursor-zoom-in"
            aria-label={`${dict.products.card.viewImage} ${product.name} ${product.presentation}`}
          />
        )}

        {product.image ? (
          hasPackagingImage ? (
            <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
              <div className="relative w-full h-full">
                <Image
                  src={product.image}
                  alt={`${product.name} ${product.presentation}`}
                  fill
                  className="object-contain object-center drop-shadow-2xl"
                  sizes="208px"
                  priority={priority}
                />
              </div>
            </div>
          ) : (
            <Image
              src={product.image}
              alt={`${product.name} ${product.presentation}`}
              fill
              className={product.line === "kumiss" ? "object-contain object-center p-3" : "object-cover"}
              sizes="208px"
              priority={priority}
            />
          )
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${accentGradient} flex flex-col items-center justify-center gap-2`}>
            <span className="text-5xl">🔜</span>
            <span className="text-white text-sm font-semibold">{dict.products.card.comingSoon}</span>
          </div>
        )}

        {/* Spotlight desde arriba — ilumina el producto sin oscurecer bordes */}
        {hasPackagingImage && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.18)_0%,transparent_65%)] pointer-events-none z-[3]" />
        )}

        {!isComingSoon && (
          <span className={`absolute top-3 right-3 ${
            hasPackagingImage
              ? "bg-white/90 backdrop-blur-sm text-gray-700"
              : `bg-gradient-to-r ${accentGradient} text-white`
          } text-xs font-bold px-2.5 py-1 rounded-full shadow z-10`}>
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
          <span className="absolute top-3 left-3 bg-[var(--color-accent,#FF9800)] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow z-10 uppercase tracking-wide">
            {dict.products.card.bestSeller}
          </span>
        )}
      </div>

      {/* Borde de color que conecta imagen con info — solo para packaging */}
      {hasPackagingImage && (
        <div className={`h-[3px] bg-gradient-to-r ${cardGradient} opacity-60`} />
      )}

      {/* Info base */}
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{displayName}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{displayDescription}</p>
        {product.price && (
          <p className="text-accent font-bold text-base mt-2">
            ${product.price.toLocaleString("es-CO")}
          </p>
        )}
      </div>

      <ProductLightbox
        product={product}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
