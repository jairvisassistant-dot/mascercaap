"use client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Image from "next/image";
import type { Product } from "@/types";

interface ProductLightboxProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductLightbox({ product, isOpen, onClose }: ProductLightboxProps) {
  if (!product.image || !isOpen) return null;

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={[
        {
          src: product.image,
          alt: `${product.name} ${product.presentation}`,
          width: 800,
          height: 800,
        },
      ]}
      render={{
        // Usa next/image en vez del <img> nativo para mantener optimización
        slide: ({ slide }) => (
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={slide.src}
              alt={slide.alt ?? ""}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority
            />
          </div>
        ),
        // Footer con info del producto
        slideFooter: () => (
          <div className="px-6 py-4 bg-black/70 text-white text-center max-w-xl mx-auto rounded-xl mb-4">
            <p className="font-bold text-lg">
              {product.name}{" "}
              <span className="text-sm font-normal opacity-70">
                {product.presentation}
              </span>
            </p>
            <p className="text-sm opacity-80 mt-1">{product.description}</p>
            {product.ingredients && product.ingredients.length > 0 && (
              <p className="text-xs opacity-60 mt-1">
                <span className="font-semibold">Ingredientes:</span>{" "}
                {product.ingredients.join(", ")}
              </p>
            )}
            {product.benefits && product.benefits.length > 0 && (
              <p className="text-xs opacity-60 mt-0.5">
                <span className="font-semibold">Beneficios:</span>{" "}
                {product.benefits.join(" · ")}
              </p>
            )}
          </div>
        ),
      }}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
    />
  );
}
