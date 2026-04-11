"use client";

import Image from "next/image";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  accentGradient?: string; // clases Tailwind de la línea, ej: "from-lime-400 to-green-500"
}

export default function ProductCard({ product, accentGradient = "from-primary to-primary-dark" }: ProductCardProps) {
  const isComingSoon = product.presentation === "Próximamente";

  return (
    <div className="relative shrink-0 w-[234px] rounded-2xl overflow-hidden shadow-md bg-white">
      {/* Imagen */}
      <div className="relative h-60 bg-gray-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={`${product.name} ${product.presentation}`}
            fill
            className="object-cover"
            sizes="208px"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${accentGradient} flex flex-col items-center justify-center gap-2`}>
            <span className="text-5xl">🔜</span>
            <span className="text-white text-sm font-semibold">Próximamente</span>
          </div>
        )}

        {/* Badge presentación */}
        {!isComingSoon && (
          <span className={`absolute top-3 right-3 bg-gradient-to-r ${accentGradient} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow`}>
            {product.presentation}
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

    </div>
  );
}
