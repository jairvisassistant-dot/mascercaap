"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductLineConfig } from "@/types";
import ProductLightbox from "./ProductLightbox";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

interface ProductGridCardProps {
  product: Product;
  line: ProductLineConfig;
  priority?: boolean;
}

export default function ProductGridCard({ product, line, priority = false }: ProductGridCardProps) {
  const { dict } = useDictionary();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isComingSoon = product.presentation === "Próximamente";
  const isSoldOut = product.isSoldOut === true;
  const isBestSeller = product.isBestSeller === true;

  return (
    <>
      <div
        className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        onClick={() => !isComingSoon && setLightboxOpen(true)}
      >
        {/* Imagen */}
        <div className={`relative aspect-[4/5] ${product.line === "kumiss" ? "bg-white" : "bg-gray-50"}`}>
          {product.image ? (
            <Image
              src={product.image}
              alt={`${product.name} ${product.presentation}`}
              fill
              className={`transition-transform duration-500 group-hover:scale-105 ${
                product.line === "kumiss" ? "object-contain object-center p-4" : "object-cover"
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              priority={priority}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${line.gradient} flex flex-col items-center justify-center gap-2`}>
              <span className="text-4xl">🔜</span>
              <span className="text-white text-xs font-semibold">{dict.products.card.comingSoon}</span>
            </div>
          )}

          {/* Tamaño badge */}
          {!isComingSoon && (
            <span className={`absolute top-2.5 right-2.5 bg-gradient-to-r ${line.gradient} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow z-10`}>
              {product.presentation}
            </span>
          )}

          {/* Best seller badge */}
          {isBestSeller && !isSoldOut && (
            <span className="absolute top-2.5 left-2.5 bg-[var(--color-accent,#FF9800)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow z-10 uppercase tracking-wide">
              {dict.products.card.bestSeller}
            </span>
          )}

          {/* Sold out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-widest uppercase shadow-lg">
                {dict.products.card.soldOut}
              </span>
            </div>
          )}

          {/* Gradient overlay en hover para el zoom icon */}
          {!isComingSoon && !isSoldOut && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
              <div className="bg-white/90 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-semibold text-gray-800 line-clamp-1 mb-2">{product.name}</p>

          {/* Category pill */}
          <div className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
            <span className="text-[11px] leading-none">{line.iconEmoji}</span>
            <span className="text-[10px] font-semibold text-gray-600">{line.label}</span>
          </div>
        </div>
      </div>

      <ProductLightbox
        product={product}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
