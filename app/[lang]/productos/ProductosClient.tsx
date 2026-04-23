"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ProductLineRow from "@/components/ui/ProductLineRow";
import PulpaFruitGrid from "@/components/ui/PulpaFruitGrid";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import type { Product, ProductLineConfig, ProductLineKey } from "@/types";

const CATEGORY_LINES: Record<string, ProductLineKey[]> = {
  jugos: ["limon", "limonada-cereza", "limonada-coco", "maracuya"],
  pulpas: ["pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango", "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba", "pulpa-frutos-rojos", "pulpa-tomate-arbol"],
  lacteos: ["kumiss"],
};

const CATEGORY_ORDER = ["jugos", "pulpas", "lacteos"] as const;
const DEFAULT_CATEGORY = "jugos";

interface ProductosClientProps {
  products: Product[];
  productLines: ProductLineConfig[];
  initialCategory?: string;
}

export default function ProductosClient({ products, productLines, initialCategory }: ProductosClientProps) {
  const { dict, lang } = useDictionary();

  // Nivel 1 — siempre hay una categoría activa, default "jugos"
  const [activeCategory, setActiveCategory] = useState<string>(() =>
    initialCategory && CATEGORY_LINES[initialCategory] ? initialCategory : DEFAULT_CATEGORY
  );

  // Nivel 2 — sub-líneas seleccionadas dentro de la categoría activa
  const [activeSubLines, setActiveSubLines] = useState<Set<ProductLineKey>>(new Set());

  // El nivel 2 solo aparece después de que el usuario interactúa con un botón de categoría
  const [hasInteracted, setHasInteracted] = useState(false);

  const [activeSize, setActiveSize] = useState<string>("todos");
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCategory(initialCategory && CATEGORY_LINES[initialCategory] ? initialCategory : DEFAULT_CATEGORY);
    setActiveSubLines(new Set());
    setActiveSize("todos");
  }, [initialCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Tamaños indexados: si hay sub-líneas activas → solo sus tamaños; si no → todos los de la categoría
  const availableSizes = useMemo(() => {
    const relevantLines: ProductLineKey[] = activeSubLines.size > 0
      ? Array.from(activeSubLines)
      : (CATEGORY_LINES[activeCategory] ?? []);

    const sizes = products
      .filter((p) => relevantLines.includes(p.line) && p.presentation !== "Próximamente")
      .map((p) => p.presentation);

    return Array.from(new Set(sizes)).sort((a, b) => {
      const toNum = (s: string) => s.endsWith("L") ? parseFloat(s) * 1000 : parseFloat(s);
      return toNum(a) - toNum(b);
    });
  }, [products, activeCategory, activeSubLines]);

  const selectCategory = (cat: string) => {
    if (activeCategory !== cat) {
      setActiveCategory(cat);
      setActiveSubLines(new Set());
      setActiveSize("todos");
    }
    setHasInteracted(true);
  };

  const toggleSubLine = (key: ProductLineKey) => {
    setActiveSubLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActiveSize("todos"); // resetear tamaño porque el índice cambia
  };

  // Líneas visibles: categoría siempre activa, sub-línea opcional
  const visibleLines = productLines.filter((line) => {
    if (!CATEGORY_LINES[activeCategory]?.includes(line.key)) return false;
    if (activeSubLines.size > 0) return activeSubLines.has(line.key);
    return true;
  });

  // Sub-líneas del nivel 2
  const categorySubLines = productLines.filter(
    (l) => CATEGORY_LINES[activeCategory]?.includes(l.key)
  );
  const showSubFilter = categorySubLines.length > 1;

  const PULPA_KEYS = new Set<ProductLineKey>([
    "pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango",
    "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba",
    "pulpa-frutos-rojos", "pulpa-tomate-arbol",
  ]);
  const nonPulpaLines = visibleLines.filter((l) => !PULPA_KEYS.has(l.key));
  const pulpaVisibleLines = visibleLines.filter((l) => PULPA_KEYS.has(l.key));

  const getLineProducts = (lineKey: ProductLineKey) =>
    products
      .filter((p) => p.line === lineKey && (activeSize === "todos" || p.presentation === activeSize))
      .sort((a, b) => a.presentationOrder - b.presentationOrder);

  const hasActiveFilters = hasInteracted || activeCategory !== DEFAULT_CATEGORY || activeSubLines.size > 0 || activeSize !== "todos";

  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const catLabels = dict.footer.productLines as Record<string, string>;

  return (
    <div className="pt-20">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-dark via-primary to-[#66BB6A] py-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="absolute right-0 inset-y-0 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto opacity-[0.07]" fill="white">
            <path d="M380 0 C240 20 120 80 80 160 C40 240 120 300 220 280 C320 260 420 180 400 80 Z" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center text-white relative z-10">
          <m.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold tracking-widest text-white/60 uppercase mb-4"
          >
            {lang === "es" ? "Del campo a tu negocio" : "From the field to your business"}
          </m.p>
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-bold mb-4 leading-tight"
          >
            {dict.products.hero.title}
          </m.h1>
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl opacity-85 max-w-2xl mx-auto"
          >
            {dict.products.hero.subtitle}
          </m.p>
        </div>
      </section>

      <div ref={sentinelRef} className="h-px" />

      {/* Filtros sticky — jerarquía de 2 niveles */}
      <div className={`sticky top-[68px] z-40 border-b transition-all duration-500 ${
        isSticky ? "bg-primary-light border-primary-light shadow-md" : "bg-white border-gray-100 shadow-sm"
      }`}>

        {/* Nivel 1 — solo categorías */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark" : "text-gray-400"}`}>
            {lang === "es" ? "Categoría:" : "Category:"}
          </span>
          {CATEGORY_ORDER.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? "bg-accent text-white border-accent shadow-sm"
                    : isSticky
                      ? "bg-white/60 text-primary-dark border-white/40 hover:bg-white hover:border-white"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                }`}
              >
                {catLabels[cat]}
                {isActive && (
                  <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            );
          })}
          {hasActiveFilters && (
            <button
              onClick={() => { setActiveCategory(DEFAULT_CATEGORY); setActiveSubLines(new Set()); setActiveSize("todos"); setHasInteracted(false); }}
              aria-label={dict.products.filters.clear}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-200 hover:scale-110 ml-1 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Nivel 2 — aparece solo cuando el usuario selecciona una categoría */}
        <AnimatePresence>
          {hasInteracted && (showSubFilter || availableSizes.length > 0) && (
            <m.div
              key={activeCategory}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className={`border-t transition-colors duration-500 ${isSticky ? "border-white/30" : "border-gray-100"}`}>
                <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">

                  {/* Sub-líneas / sabores */}
                  {showSubFilter && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-gray-400"}`}>
                        {lang === "es" ? "Sabor:" : "Flavor:"}
                      </span>
                      {categorySubLines.map((line) => {
                        const isActive = activeSubLines.has(line.key);
                        return (
                          <button
                            key={line.key}
                            onClick={() => toggleSubLine(line.key)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                              isActive
                                ? "bg-primary/15 text-primary-dark border-primary/40 shadow-sm"
                                : isSticky
                                  ? "bg-white/50 text-primary-dark border-white/30 hover:bg-white"
                                  : "bg-white text-gray-500 border-gray-200 hover:border-primary/30 hover:text-primary"
                            }`}
                          >
                            <span>{line.iconEmoji}</span>
                            <span>{pl[line.key]?.label ?? line.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Tamaños — solo cuando hay 0 o 2+ sub-líneas activas */}
                  {availableSizes.length > 0 && activeSubLines.size !== 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-gray-400"}`}>
                        {dict.products.filters.size}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        {["todos", ...availableSizes].map((size) => (
                          <button
                            key={size}
                            onClick={() => setActiveSize(size)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                              activeSize === size
                                ? "bg-accent text-white border-accent shadow-sm"
                                : isSticky
                                  ? "bg-white/60 text-primary-dark border-white/40 hover:bg-white"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent"
                            }`}
                          >
                            {size === "todos" ? dict.products.filters.all : size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Líneas de producto */}
      <section className="py-10 bg-white min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-12">
          {nonPulpaLines.map((line, lineIndex) => {
            const lineProducts = getLineProducts(line.key);
            return (
              <m.div
                key={line.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: lineIndex * 0.08 }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${line.gradient} flex items-center justify-center text-xl shadow-sm`}>
                    {line.iconEmoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{pl[line.key]?.label ?? line.label}</h2>
                    <p className="text-sm text-gray-500">{pl[line.key]?.description ?? line.description}</p>
                  </div>
                </div>
                {lineProducts.length > 0 && (
                  <ProductLineRow line={line} products={lineProducts} firstLine={lineIndex === 0} />
                )}
              </m.div>
            );
          })}

          {pulpaVisibleLines.length > 0 && (
            activeSize !== "todos" ? (
              <>
                {pulpaVisibleLines.map((line, idx) => {
                  const lineProducts = getLineProducts(line.key);
                  if (lineProducts.length === 0) return null;
                  return (
                    <m.div
                      key={line.key}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: (nonPulpaLines.length + idx) * 0.08 }}
                    >
                      <div className="flex items-center gap-4 mb-5">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${line.gradient} flex items-center justify-center text-xl shadow-sm`}>
                          {line.iconEmoji}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">{pl[line.key]?.label ?? line.label}</h2>
                          <p className="text-sm text-gray-500">{pl[line.key]?.description ?? line.description}</p>
                        </div>
                      </div>
                      <ProductLineRow line={line} products={lineProducts} firstLine={false} />
                    </m.div>
                  );
                })}
              </>
            ) : (
              <m.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: nonPulpaLines.length * 0.08 }}
              >
                <PulpaFruitGrid
                  pulpaLines={pulpaVisibleLines}
                  products={products.filter((p) => PULPA_KEYS.has(p.line))}
                />
              </m.div>
            )
          )}
        </div>
      </section>

      {/* CTA — sección de cierre comercial */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/8 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            <div>
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block mb-4">
                {lang === "es" ? "Pedidos personalizados" : "Custom orders"}
              </span>
              <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                {dict.products.cta.title}
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                {dict.products.cta.text}
              </p>
              <Link
                href={`/${lang}/contacto`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-full transition-all hover:scale-105 shadow-lg shadow-primary/30"
              >
                {dict.products.cta.button}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "13+", label: lang === "es" ? "Variedades de productos" : "Product varieties" },
                { value: "<24h", label: lang === "es" ? "Entrega en Bogotá" : "Delivery in Bogotá" },
                { value: "100%", label: lang === "es" ? "Natural, sin conservantes" : "Natural, no preservatives" },
                { value: "3", label: lang === "es" ? "Líneas de producto" : "Product lines" },
              ].map((stat, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 text-center"
                >
                  <span className="text-3xl font-bold text-primary block mb-1">{stat.value}</span>
                  <span className="text-gray-400 text-xs leading-snug">{stat.label}</span>
                </m.div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
