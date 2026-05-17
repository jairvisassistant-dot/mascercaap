"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import ProductCard from "@/components/ui/ProductCard";
import type { Product, ProductLineConfig } from "@/types";
import type { Dictionary } from "@/lib/i18n";

interface ProductLineRowProps {
  line: ProductLineConfig;
  products: Product[];
  firstLine?: boolean;
  dict: Dictionary;
  lang: string;
}

export default function ProductLineRow({ line, products, firstLine = false, dict, lang }: ProductLineRowProps) {
  const pl = dict.productLines as Record<string, { label: string }>;
  const displayLineLabel = pl[line.key]?.label ?? line.label;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, products]);

  const scrollLeft = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: -(el.clientWidth * 0.75), behavior: "smooth" });
  };

  const scrollRight = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.75, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      {/* Flecha izquierda */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-surface-card border border-border-soft rounded-full shadow-md flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all -translate-x-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          aria-label={`${dict.products.scrollPrev} ${displayLineLabel}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Flecha derecha */}
      {canScrollRight && (
        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-surface-card border border-border-soft rounded-full shadow-md flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all translate-x-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          aria-label={`${dict.products.scrollNext} ${displayLineLabel}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-3 px-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
      >
        <div className="flex gap-5 w-fit mx-auto">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              accentGradient={line.gradient}
              priority={firstLine && index === 0}
              dict={dict}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
