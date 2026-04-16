"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ProductCard from "@/components/ui/ProductCard";
import type { Product, ProductLineConfig, ProductLineKey } from "@/types";

interface PulpaFruitGridProps {
  pulpaLines: ProductLineConfig[];
  products: Product[];
}

export default function PulpaFruitGrid({ pulpaLines, products }: PulpaFruitGridProps) {
  const [selectedKey, setSelectedKey] = useState<ProductLineKey | null>(null);

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
          <h2 className="text-xl font-bold text-gray-800">Nuestros Sabores</h2>
          <p className="text-sm text-gray-500">
            Tocá una fruta para ver sus presentaciones disponibles
          </p>
        </div>
      </div>

      {/* Fruit picker grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {pulpaLines.map((line) => {
          const isSelected = selectedKey === line.key;
          const fruitSlug = line.key.replace("pulpa-", "");
          const fruitImage = `/imgs/fruta-${fruitSlug}.webp`;
          const fruitName = line.label.replace("Pulpa de ", "");

          return (
            <button
              key={line.key}
              onClick={() => handleSelect(line.key)}
              className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all focus:outline-none ${
                isSelected
                  ? "bg-primary/8 ring-2 ring-primary ring-offset-1"
                  : "hover:bg-gray-100"
              }`}
              aria-pressed={isSelected}
              aria-label={`Ver presentaciones de ${fruitName}`}
            >
              <div
                className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all shadow-sm ${
                  isSelected ? "border-primary shadow-md" : "border-gray-200"
                }`}
              >
                <Image
                  src={fruitImage}
                  alt={fruitName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
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
            {/* Panel header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${selectedLine.gradient} flex items-center justify-center text-base shadow-sm`}
              >
                {selectedLine.iconEmoji}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{selectedLine.label}</h3>
                <p className="text-xs text-gray-500">
                  {selectedProducts.length} presentación
                  {selectedProducts.length !== 1 ? "es" : ""} disponible
                  {selectedProducts.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Product cards — horizontal scroll */}
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
