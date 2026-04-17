"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import type { Product, ProductLineConfig } from "@/types";

interface ProductLineRowProps {
  line: ProductLineConfig;
  products: Product[];
}

const SCROLL_AMOUNT = 254; // card width (234) + gap (20)

export default function ProductLineRow({ line, products }: ProductLineRowProps) {
  const { dict } = useDictionary();
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
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      {/* Flecha izquierda */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all -translate-x-1/2"
          aria-label={`${dict.products.scrollPrev} ${line.label}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Flecha derecha */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all translate-x-1/2"
          aria-label={`${dict.products.scrollNext} ${line.label}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
      >
        <div className="flex gap-5 w-fit mx-auto">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              accentGradient={line.gradient}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
