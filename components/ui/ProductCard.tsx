"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types";
import ProductLightbox from "./ProductLightbox";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

interface ProductCardProps {
  product: Product;
  accentGradient?: string;
  priority?: boolean;
}

export default function ProductCard({ product, accentGradient = "from-primary to-primary-dark", priority = false }: ProductCardProps) {
  const { dict } = useDictionary();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isComingSoon = product.presentation === "Próximamente";
  const isSoldOut = product.isSoldOut === true;
  const isBestSeller = product.isBestSeller === true;

  return (
    <div className="relative shrink-0 w-[234px] rounded-2xl overflow-hidden shadow-md bg-white">
      {/* Imagen */}
      <div className={`relative h-60 ${product.line === "kumiss" ? "bg-white" : "bg-gray-100"}`}>
        {product.image && !isComingSoon && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0 z-0 w-full h-full cursor-zoom-in"
            aria-label={`${dict.products.card.viewImage} ${product.name} ${product.presentation}`}
          />
        )}

        {product.image ? (
          <Image
            src={product.image}
            alt={`${product.name} ${product.presentation}`}
            fill
            className={product.line === "kumiss" ? "object-contain object-center p-3" : "object-cover"}
            sizes="208px"
            priority={priority}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${accentGradient} flex flex-col items-center justify-center gap-2`}>
            <span className="text-5xl">🔜</span>
            <span className="text-white text-sm font-semibold">{dict.products.card.comingSoon}</span>
          </div>
        )}

        {!isComingSoon && (
          <span className={`absolute top-3 right-3 bg-gradient-to-r ${accentGradient} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow z-10`}>
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

      {/* Info base */}
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
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
