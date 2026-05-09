"use client";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Image from "next/image";
import type { Product } from "@/types";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

interface ProductLightboxProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductLightbox({ product, isOpen, onClose }: ProductLightboxProps) {
  const { dict, lang } = useDictionary();
  const t = dict.products.lightbox;
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[product.line]?.label ?? product.name;
  const displayDescription = lang !== "es" ? (pl[product.line]?.description ?? product.description) : product.description;

  if (!product.image || !isOpen) return null;

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={[
        {
          src: product.image,
          alt: `${displayName} ${product.presentation}`,
          width: 800,
          height: 800,
        },
      ]}
      render={{
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
        slideFooter: () => (
          <div className="px-6 py-4 bg-black/70 text-white text-center max-w-xl mx-auto rounded-xl mb-4">
            <p className="font-bold text-lg">
              {displayName}{" "}
              <span className="text-sm font-normal opacity-70">
                {product.presentation}
              </span>
            </p>
            <p className="text-sm opacity-80 mt-1">{displayDescription}</p>
            {lang === "es" && product.ingredients && product.ingredients.length > 0 && (
              <p className="text-xs opacity-60 mt-1">
                <span className="font-semibold">{t.ingredients}:</span>{" "}
                {product.ingredients.join(", ")}
              </p>
            )}
            {lang === "es" && product.benefits && product.benefits.length > 0 && (
              <p className="text-xs opacity-60 mt-0.5">
                <span className="font-semibold">{t.benefits}:</span>{" "}
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
