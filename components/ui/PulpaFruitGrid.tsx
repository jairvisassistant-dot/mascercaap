"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ProductCard from "@/components/ui/ProductCard";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import type { Product, ProductLineConfig, ProductLineKey } from "@/types";

function FruitImage({ slug, name }: { slug: string; name: string }) {
  const [src, setSrc] = useState(`/imgs/fruta-${slug}.webp`);
  return (
    <Image
      src={src}
      alt={name}
      fill
      className="object-cover"
      sizes="74px"
      onError={() => setSrc(`/imgs/pulpa-${slug}.webp`)}
    />
  );
}

interface PulpaFruitGridProps {
  pulpaLines: ProductLineConfig[];
  products: Product[];
}

export default function PulpaFruitGrid({ pulpaLines, products }: PulpaFruitGridProps) {
  const { dict } = useDictionary();
  const [selectedKey, setSelectedKey] = useState<ProductLineKey | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pl = dict.productLines as Record<string, { label: string; description: string }>;

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
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xl shadow-sm">
          🫐
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{dict.products.pulpaGrid.title}</h2>
          <p className="text-sm text-gray-500">{dict.products.pulpaGrid.subtitle}</p>
        </div>
      </div>

      {/* Fruit picker carousel */}
      <div className="relative flex items-center gap-1">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          aria-label="Ver anteriores"
          className={`shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-all ${
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
          className="flex gap-2 overflow-x-auto scrollbar-none flex-1 py-1"
        >
          {pulpaLines.map((line) => {
            const isSelected = selectedKey === line.key;
            const fruitSlug = line.key.replace("pulpa-", "");
            const fruitName = (pl[line.key]?.label ?? line.label).replace(/Pulpa de |Pulp$/gi, "").trim();

            return (
              <button
                key={line.key}
                onClick={() => handleSelect(line.key)}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all focus:outline-none shrink-0 w-[88px] ${
                  isSelected
                    ? "bg-primary/8 ring-2 ring-primary ring-offset-1"
                    : "hover:bg-gray-100"
                }`}
                aria-pressed={isSelected}
                aria-label={fruitName}
              >
                <div
                  className={`relative w-[74px] h-[74px] rounded-full overflow-hidden border-2 transition-all shadow-sm ${
                    isSelected ? "border-primary shadow-md" : "border-gray-200"
                  }`}
                >
                  <FruitImage slug={fruitSlug} name={fruitName} />
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight transition-colors ${
                    isSelected ? "text-primary" : "text-gray-600"
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
          onClick={() => scroll("right")}
          aria-label="Ver más sabores"
          className={`shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-all ${
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
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-5 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${selectedLine.gradient} flex items-center justify-center text-base shadow-sm`}
              >
                {selectedLine.iconEmoji}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{pl[selectedLine.key]?.label ?? selectedLine.label}</h3>
                <p className="text-xs text-gray-500">
                  {selectedProducts.length}{" "}
                  {selectedProducts.length !== 1
                    ? dict.products.pulpaGrid.presentations
                    : dict.products.pulpaGrid.presentation}{" "}
                  {selectedProducts.length !== 1
                    ? dict.products.pulpaGrid.availablePlural
                    : dict.products.pulpaGrid.available}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
