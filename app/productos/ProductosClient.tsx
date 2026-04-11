"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ProductLineRow from "@/components/ui/ProductLineRow";
import type { Product, ProductLineConfig, ProductLineKey } from "@/types";

interface ProductosClientProps {
  products: Product[];
  productLines: ProductLineConfig[];
}

export default function ProductosClient({ products, productLines }: ProductosClientProps) {
  const [activeLines, setActiveLines] = useState<Set<ProductLineKey>>(new Set());
  const [activeSize, setActiveSize] = useState<string>("todos");
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Presentaciones únicas disponibles (excluye "Próximamente")
  const availableSizes = useMemo(() => {
    const sizes = products
      .map((p) => p.presentation)
      .filter((s) => s !== "Próximamente");
    const unique = Array.from(new Set(sizes)).sort((a, b) => {
      const toMl = (s: string) => {
        if (s.endsWith("L")) return parseFloat(s) * 1000;
        return parseFloat(s);
      };
      return toMl(a) - toMl(b);
    });
    return unique;
  }, [products]);

  const toggleLine = (key: ProductLineKey) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Líneas visibles (todas si no hay filtro activo)
  const visibleLines = productLines.filter(
    (line) => activeLines.size === 0 || activeLines.has(line.key)
  );

  // Productos de una línea, filtrados por tamaño y ordenados
  const getLineProducts = (lineKey: ProductLineKey) => {
    return products
      .filter((p) => {
        const lineMatch = p.line === lineKey;
        const sizeMatch = activeSize === "todos" || p.presentation === activeSize;
        return lineMatch && sizeMatch;
      })
      .sort((a, b) => a.presentationOrder - b.presentationOrder);
  };

  const hasActiveFilters = activeLines.size > 0 || activeSize !== "todos";

  return (
    <div className="pt-20">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-r from-primary to-primary-dark py-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-white">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Nuestros Productos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl opacity-90 max-w-2xl mx-auto"
          >
            Del campo colombiano directo a tu mesa. Jugos, pulpas y bebidas
            naturales sin conservantes ni aditivos.
          </motion.p>
        </div>
      </section>

      {/* Sentinel — detecta cuándo el hero sale del viewport */}
      <div ref={sentinelRef} className="h-px" />

      {/* ── Filtros sticky ── */}
      <section className={`sticky top-[68px] z-40 border-b py-3 transition-all duration-500 ${
        isSticky
          ? "bg-primary-light border-primary-light shadow-md"
          : "bg-white border-gray-100 shadow-sm"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">

          {/* Filtro por línea */}
          <div className="flex flex-wrap gap-2">
            {productLines.map((line) => {
              const isActive = activeLines.has(line.key);
              return (
                <button
                  key={line.key}
                  onClick={() => toggleLine(line.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-sm"
                      : isSticky
                        ? "bg-white/60 text-primary-dark border-white/40 hover:bg-white hover:border-white"
                        : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  <span>{line.iconEmoji}</span>
                  <span>{line.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filtro por presentación */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium uppercase tracking-wide transition-colors duration-500 ${isSticky ? "text-primary-dark" : "text-gray-400"}`}>Tamaño:</span>
            <div className="flex gap-1.5">
              {["todos", ...availableSizes].map((size) => (
                <button
                  key={size}
                  onClick={() => setActiveSize(size)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    activeSize === size
                      ? "bg-accent text-white border-accent shadow-sm"
                      : isSticky
                        ? "bg-white/60 text-primary-dark border-white/40 hover:bg-white hover:border-white"
                        : "bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent"
                  }`}
                >
                  {size === "todos" ? "Todos" : size}
                </button>
              ))}
            </div>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setActiveLines(new Set());
                  setActiveSize("todos");
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1 underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Líneas de producto ── */}
      <section className="py-10 bg-gray-50 min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-12">
          {visibleLines.map((line, lineIndex) => {
            const lineProducts = getLineProducts(line.key);

            return (
              <motion.div
                key={line.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: lineIndex * 0.08 }}
              >
                {/* Header de la línea */}
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${line.gradient} flex items-center justify-center text-xl shadow-sm`}>
                    {line.iconEmoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{line.label}</h2>
                    <p className="text-sm text-gray-500">{line.description}</p>
                  </div>
                </div>

                {/* Carrusel de cards */}
                {lineProducts.length > 0 ? (
                  <ProductLineRow line={line} products={lineProducts} />
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            ¿No encontrás lo que buscás?
          </h3>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            Contáctanos directamente. Tenemos más variedades y podemos armar
            pedidos a la medida de tu negocio.
          </p>
          <Link
            href="/contacto"
            className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-full transition-all hover:scale-105 shadow-md"
          >
            Hablar con nosotros
          </Link>
        </div>
      </section>

    </div>
  );
}
