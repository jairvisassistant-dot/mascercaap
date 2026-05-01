"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ProductLineRow from "@/components/ui/ProductLineRow";
import ProductGridCard from "@/components/ui/ProductGridCard";
import PulpaFruitGrid from "@/components/ui/PulpaFruitGrid";
import EmojiIcon from "@/components/ui/EmojiIcon";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import type { Product, ProductLineConfig, ProductLineKey } from "@/types";

const CATEGORY_LINES: Record<string, ProductLineKey[]> = {
  todas: ["limon", "limonada-cereza", "limonada-coco", "maracuya", "pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango", "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba", "pulpa-frutos-rojos", "pulpa-tomate-arbol", "kumiss"],
  jugos: ["limon", "limonada-cereza", "limonada-coco", "maracuya"],
  pulpas: ["pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango", "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba", "pulpa-frutos-rojos", "pulpa-tomate-arbol"],
  lacteos: ["kumiss"],
};

const CATEGORY_ORDER = ["todas", "jugos", "pulpas", "lacteos"] as const;
const DEFAULT_CATEGORY = "todas";

const PULPA_KEYS = new Set<ProductLineKey>([
  "pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango",
  "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba",
  "pulpa-frutos-rojos", "pulpa-tomate-arbol",
]);

interface ProductosClientProps {
  products: Product[];
  productLines: ProductLineConfig[];
  initialCategory?: string;
}

export default function ProductosClient({ products, productLines, initialCategory }: ProductosClientProps) {
  const { dict, lang } = useDictionary();

  // Nivel 1 — siempre hay una categoría activa, default "todas"
  const [activeCategory, setActiveCategory] = useState<string>(() =>
    initialCategory && CATEGORY_LINES[initialCategory] ? initialCategory : DEFAULT_CATEGORY
  );

  // Nivel 2 — sub-líneas seleccionadas dentro de la categoría activa
  const [activeSubLines, setActiveSubLines] = useState<ProductLineKey[]>([]);

  // El nivel 2 solo aparece después de que el usuario interactúa con un botón de categoría
  const [hasInteracted, setHasInteracted] = useState(false);

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

  // Tamaños indexados: si hay sub-líneas activas → solo sus tamaños; si no → todos los de la categoría
  const availableSizes = useMemo(() => {
    const relevantLines: ProductLineKey[] = activeSubLines.length > 0
      ? activeSubLines
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
      setActiveSubLines([]);
      setActiveSize("todos");
    }
    setHasInteracted(cat !== "todas");
  };

  const toggleSubLine = (key: ProductLineKey) => {
    setActiveSubLines((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
    setActiveSize("todos"); // resetear tamaño porque el índice cambia
  };

  // Líneas visibles: categoría siempre activa, sub-línea opcional
  const visibleLines = useMemo(() => productLines.filter((line) => {
    if (!CATEGORY_LINES[activeCategory]?.includes(line.key)) return false;
    if (activeSubLines.length > 0) return activeSubLines.includes(line.key);
    return true;
  }), [productLines, activeCategory, activeSubLines]);

  // Sub-líneas del nivel 2
  const categorySubLines = useMemo(() => productLines.filter(
    (l) => CATEGORY_LINES[activeCategory]?.includes(l.key)
  ), [productLines, activeCategory]);
  const showSubFilter = activeCategory !== "todas" && categorySubLines.length > 1;

  const nonPulpaLines = visibleLines.filter((l) => !PULPA_KEYS.has(l.key));
  const pulpaVisibleLines = visibleLines.filter((l) => PULPA_KEYS.has(l.key));

  const getLineProducts = (lineKey: ProductLineKey) =>
    products
      .filter((p) => p.line === lineKey && (activeSize === "todos" || p.presentation === activeSize))
      .sort((a, b) => a.presentationOrder - b.presentationOrder);

  const hasActiveFilters = hasInteracted || activeCategory !== DEFAULT_CATEGORY || activeSubLines.length > 0 || activeSize !== "todos";

  const sizeFilteredItems = useMemo(() => {
    if (activeSize === "todos") return [];
    return visibleLines.flatMap((line) =>
      products
        .filter((p) => p.line === line.key && p.presentation === activeSize)
        .sort((a, b) => a.presentationOrder - b.presentationOrder)
        .map((p) => ({ product: p, line }))
    );
  }, [activeSize, visibleLines, products]);

  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const catLabels = dict.footer.productLines as Record<string, string>;

  return (
    <div className="pt-20">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-dark via-primary to-[#5f9f63] py-16 overflow-hidden">
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
            {dict.products.hero.eyebrow}
          </m.p>
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-dm-serif text-4xl md:text-6xl mb-4 leading-tight"
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
      <div className={`sticky top-[92px] z-40 border-b transition-all duration-500 ${
        isSticky ? "bg-primary-light border-primary-light shadow-md" : "bg-surface-page border-border-soft shadow-sm"
      }`}>

        {/* Nivel 1 — solo categorías */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark" : "text-text-faint"}`}>
            {dict.products.filters.category}
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
                      ? "bg-white/30 text-primary-dark border-white/25 hover:bg-white/50 hover:border-white/40"
                      : "bg-surface-card text-text-muted border-border-soft hover:border-primary hover:text-primary"
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
              onClick={() => { setActiveCategory(DEFAULT_CATEGORY); setActiveSubLines([]); setActiveSize("todos"); setHasInteracted(false); }}
              aria-label={dict.products.filters.clear}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-page hover:bg-red-50 text-text-faint hover:text-red-500 transition-all duration-200 hover:scale-110 ml-1 shrink-0"
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
              <div className={`border-t transition-colors duration-500 ${isSticky ? "border-white/30" : "border-border-soft"}`}>
                <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">

                  {/* Sub-líneas / sabores — ocupa el espacio disponible, wrappea en hasta 2 filas */}
                  {showSubFilter && (
                    <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0 min-w-0">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-text-faint"}`}>
                        {dict.products.filters.flavor}
                      </span>
                      {categorySubLines.map((line) => {
                        const isActive = activeSubLines.includes(line.key);
                        return (
                          <button
                            key={line.key}
                            onClick={() => toggleSubLine(line.key)}
                            className={`flex shrink-0 items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                              isActive
                                ? "bg-primary/15 text-primary-dark border-primary/40 shadow-sm"
                                : isSticky
                                  ? "bg-white/25 text-primary-dark border-white/20 hover:bg-white/40"
                                  : "bg-surface-card text-text-muted border-border-soft hover:border-primary/30 hover:text-primary"
                            }`}
                          >
                            <span>{line.iconEmoji}</span>
                            <span>{pl[line.key]?.label ?? line.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Tamaños — anclado a la derecha, nunca baja */}
                  {availableSizes.length > 0 && activeSubLines.length !== 1 && activeCategory !== "todas" && (
                    <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 md:shrink-0 md:self-start md:overflow-visible md:pb-0">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-text-faint"}`}>
                        {dict.products.filters.size}
                      </span>
                      <div className="flex gap-1.5">
                        {["todos", ...availableSizes].map((size) => (
                          <button
                            key={size}
                            onClick={() => setActiveSize(size)}
                              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                              activeSize === size
                                ? "bg-accent text-white border-accent shadow-sm"
                                : isSticky
                                  ? "bg-white/30 text-primary-dark border-white/25 hover:bg-white/50"
                                  : "bg-surface-card text-text-muted border-border-soft hover:border-accent hover:text-accent"
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
      <section className="py-10 bg-surface-page min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4">

          {/* Grid flat cuando hay filtro de tamaño activo */}
          {activeSize !== "todos" ? (
            <m.div
              key={`grid-${activeSize}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {sizeFilteredItems.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-text-faint uppercase tracking-widest mb-5">
                    {sizeFilteredItems.length} {dict.products.filters.countLabel} {activeSize}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sizeFilteredItems.map(({ product, line }, index) => (
                      <ProductGridCard
                        key={product.id}
                        product={product}
                        line={line}
                        priority={index < 5}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <EmojiIcon emoji="🔍" label={dict.products.filters.empty} size="xl" tone="neutral" decorative={false} className="mb-4" />
                  <p className="text-text-muted text-base font-medium">
                    {dict.products.filters.empty}
                  </p>
                </div>
              )}
            </m.div>
          ) : (
            <div className="flex flex-col gap-12">
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
                        <h2 className="text-xl font-bold text-text-main">{pl[line.key]?.label ?? line.label}</h2>
                        <p className="text-sm text-text-muted">{pl[line.key]?.description ?? line.description}</p>
                      </div>
                    </div>
                    {lineProducts.length > 0 && (
                      <ProductLineRow line={line} products={lineProducts} firstLine={lineIndex === 0} />
                    )}
                  </m.div>
                );
              })}

              {pulpaVisibleLines.length > 0 && (
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
              )}
            </div>
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
                {dict.products.cta.badge}
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
              {dict.products.cta.stats.map((stat, i) => (
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
