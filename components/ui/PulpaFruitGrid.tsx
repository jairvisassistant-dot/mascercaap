"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ProductCard from "@/components/ui/ProductCard";
import type { Product, ProductLineConfig, ProductLineKey, ProductLineTranslation } from "@/types";

type PulpaGridDict = {
  title: string;
  subtitle: string;
  presentation: string;
  presentations: string;
  available: string;
  availablePlural: string;
  scrollPrev: string;
  scrollNext: string;
  disclaimer: string;
};

function FruitImage({ slug, label, chipImage }: { slug: string; label: string; chipImage?: string }) {
  return (
    <Image
      src={chipImage ?? `/imgs/pulpaPortada-${slug}.webp`}
      alt={label}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 64px, 80px"
    />
  );
}

interface PulpaFruitGridProps {
  pulpaLines: ProductLineConfig[];
  products: Product[];
  pl: Record<string, ProductLineTranslation>;
  pulpaGridDict: PulpaGridDict;
}

export default function PulpaFruitGrid({ pulpaLines, products, pl, pulpaGridDict }: PulpaFruitGridProps) {
  const [selectedKey, setSelectedKey] = useState<ProductLineKey | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, pulpaLines]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  const getLineProducts = (key: ProductLineKey) =>
    products
      .filter((p) => p.line === key)
      .sort((a, b) => a.presentationOrder - b.presentationOrder);

  const selectedLine = pulpaLines.find((l) => l.key === selectedKey);
  const selectedProducts = selectedKey ? getLineProducts(selectedKey) : [];

  const handleSelect = (key: ProductLineKey) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div aria-hidden="true" className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xl shadow-sm">
          🫐
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-main">{pulpaGridDict.title}</h2>
          <p className="text-sm text-text-muted">{pulpaGridDict.subtitle}</p>
        </div>
      </div>

      {/* Fruit picker carousel */}
      <div className="relative flex items-center gap-1">
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label={pulpaGridDict.scrollPrev}
          className={`shrink-0 w-8 h-8 rounded-full border border-border-soft bg-surface-card shadow-sm flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
            canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-2 overflow-x-auto scrollbar-none flex-1 py-1 px-1"
        >
          {pulpaLines.map((line) => {
            const isSelected = selectedKey === line.key;
            const fruitSlug = line.key.replace("pulpa-", "");
            const fruitLabel = pl[line.key]?.label ?? line.label;
            const fruitName = fruitLabel.replace(/Pulpa de |Pulp$/gi, "").trim();

            return (
              <button
                type="button"
                key={line.key}
                onClick={() => handleSelect(line.key)}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page shrink-0 w-20 sm:w-24 ${
                  isSelected
                    ? "bg-primary/8 ring-2 ring-primary ring-offset-1"
                    : "hover:bg-surface-page"
                }`}
                aria-pressed={isSelected}
                aria-label={fruitName}
              >
                <div
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 transition-all shadow-sm ${
                    isSelected ? "border-primary shadow-md" : "border-border-soft"
                  }`}
                >
                  <FruitImage slug={fruitSlug} label={fruitLabel} chipImage={line.chipImage} />
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight transition-colors ${
                    isSelected ? "text-primary" : "text-text-muted"
                  }`}
                >
                  {fruitName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label={pulpaGridDict.scrollNext}
          className={`shrink-0 w-8 h-8 rounded-full border border-border-soft bg-surface-card shadow-sm flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
            canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Expandable product panel */}
      <AnimatePresence mode="wait">
        {selectedKey && selectedLine && selectedProducts.length > 0 && (
          <m.div
            key={selectedKey}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-5 bg-surface-card rounded-2xl p-4 border border-border-soft shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${selectedLine.gradient} flex items-center justify-center text-base shadow-sm`}
              >
                {selectedLine.iconEmoji}
              </div>
              <div>
                <h3 className="font-bold text-text-main">{pl[selectedLine.key]?.label ?? selectedLine.label}</h3>
                <p className="text-xs text-text-muted">
                  {selectedProducts.length}{" "}
                  {selectedProducts.length !== 1
                    ? pulpaGridDict.presentations
                    : pulpaGridDict.presentation}{" "}
                  {selectedProducts.length !== 1
                    ? pulpaGridDict.availablePlural
                    : pulpaGridDict.available}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <div className="flex gap-5 w-fit mx-auto">
                {selectedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    accentGradient={selectedLine.gradient}
                  />
                ))}
              </div>
            </div>

            <p className="mt-4 text-xs text-text-faint text-center leading-relaxed">
              <span aria-hidden="true">📷</span> {pulpaGridDict.disclaimer}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
