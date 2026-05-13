"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ProductLineRow from "@/components/ui/ProductLineRow";
import ProductGridCard from "@/components/ui/ProductGridCard";
import PulpaFruitGrid from "@/components/ui/PulpaFruitGrid";
import EmojiIcon from "@/components/ui/EmojiIcon";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import type { Product, ProductCategory, ProductLineConfig, ProductLineKey } from "@/types";

const DEFAULT_CATEGORY = "todas";

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const PULPA_KEYS = new Set<ProductLineKey>([
  "pulpa-maracuya", "pulpa-mora", "pulpa-fresa", "pulpa-mango",
  "pulpa-guanabana", "pulpa-lulo", "pulpa-guayaba",
  "pulpa-frutos-rojos", "pulpa-frutos-amarillos", "pulpa-tomate-arbol",
]);

interface ProductosClientProps {
  products: Product[];
  productLines: ProductLineConfig[];
  categories: ProductCategory[];
}

export default function ProductosClient({ products, productLines, categories }: ProductosClientProps) {
  const searchParams = useSearchParams();
  const { dict, lang } = useDictionary();

  // Mapa dinámico: categoryKey → line keys. "todas" siempre incluye todo.
  const categoryLines = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {
      todas: productLines.map((l) => l.key),
    };
    for (const cat of categories) {
      const keys: string[] = [];
      for (const l of productLines) {
        if (l.categoryKey === cat.key) keys.push(l.key);
      }
      map[cat.key] = keys;
    }
    return map;
  }, [productLines, categories]);

  const categoryOrder = useMemo(
    () => [DEFAULT_CATEGORY, ...categories.map((c) => c.key)],
    [categories],
  );

  // Labels de categorías: "todas" del dict, el resto de la DB
  const catLabels = useMemo<Record<string, string>>(() => {
    const dictLabels = dict.footer.productLines as Record<string, string>;
    const labels: Record<string, string> = { todas: dictLabels.todas ?? "Todas" };
    for (const cat of categories) {
      labels[cat.key] = dictLabels[cat.key] ?? cat.label;
    }
    return labels;
  }, [categories, dict]);

  // Nivel 1 — siempre hay una categoría activa, default "todas"
  const catFromUrl = searchParams.get("categoria") ?? DEFAULT_CATEGORY;
  const [activeCategory, setActiveCategory] = useState<string>(catFromUrl);

  // Nivel 2 — sub-líneas seleccionadas dentro de la categoría activa
  const [activeSubLines, setActiveSubLines] = useState<ProductLineKey[]>([]);

  // El nivel 2 solo aparece después de que el usuario interactúa con un botón de categoría
  const [hasInteracted, setHasInteracted] = useState(false);

  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [activeSize, setActiveSize] = useState<string>("todos");
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sync URL param changes to local state during render (derived state, NOT effect)
  if (catFromUrl !== activeCategory) {
    setActiveCategory(catFromUrl);
    setActiveSubLines([]);
    setActiveSize("todos");
    setHasInteracted(false);
  }

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
    const relevantLines: string[] = activeSubLines.length > 0
      ? activeSubLines
      : (categoryLines[activeCategory] ?? []);

    const relevantLineSet = new Set(relevantLines);
    const sizes: string[] = [];
    for (const p of products) {
      if (relevantLineSet.has(p.line) && p.presentation !== "Próximamente") {
        sizes.push(p.presentation);
      }
    }

    return Array.from(new Set(sizes)).sort((a, b) => {
      const toNum = (s: string) => s.endsWith("L") ? parseFloat(s) * 1000 : parseFloat(s);
      return toNum(a) - toNum(b);
    });
  }, [products, activeCategory, activeSubLines, categoryLines]);

  const selectCategory = (cat: string) => {
    if (activeCategory !== cat) {
      setActiveCategory(cat);
      setActiveSubLines([]);
      setActiveSize("todos");
    }
    setHasInteracted(true);
  };

  const toggleSubLine = (key: ProductLineKey) => {
    setActiveSubLines((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
    setActiveSize("todos"); // resetear tamaño porque el índice cambia
  };

  // Índice de posición de cada categoría (para ordenar líneas por categoría)
  const catIndex = useMemo(() => {
    const idx: Record<string, number> = {};
    categories.forEach((cat, i) => { idx[cat.key] = i; });
    return idx;
  }, [categories]);

  // Líneas visibles: filtradas por categoría/sub-línea y ordenadas por posición de categoría
  const visibleLines = useMemo(() => productLines
    .filter((line) => {
      if (!categoryLines[activeCategory]?.includes(line.key)) return false;
      if (activeSubLines.length > 0) return activeSubLines.includes(line.key);
      return true;
    })
    .sort((a, b) => {
      const ia = catIndex[a.categoryKey ?? ""] ?? categories.length;
      const ib = catIndex[b.categoryKey ?? ""] ?? categories.length;
      return ia - ib;
      // Dentro de la misma categoría el array ya viene ordenado por display_order desde la DB
    }),
  [productLines, activeCategory, activeSubLines, categoryLines, catIndex, categories.length]);

  // Sub-líneas del nivel 2
  const categorySubLines = useMemo(() => productLines.filter(
    (l) => categoryLines[activeCategory]?.includes(l.key)
  ), [productLines, activeCategory, categoryLines]);
  const showSubFilter = activeCategory !== "todas" && categorySubLines.length > 1;

  // Build ordered segments: consecutive pulpa lines → one PulpaFruitGrid; others → individual rows
  type RenderSegment =
    | { type: "regular"; line: ProductLineConfig }
    | { type: "pulpa"; lines: ProductLineConfig[] };

  const segments = useMemo<RenderSegment[]>(() => {
    const result: RenderSegment[] = [];
    let pulpaBuffer: ProductLineConfig[] = [];
    for (const line of visibleLines) {
      if (PULPA_KEYS.has(line.key)) {
        pulpaBuffer.push(line);
      } else {
        if (pulpaBuffer.length > 0) {
          result.push({ type: "pulpa", lines: pulpaBuffer });
          pulpaBuffer = [];
        }
        result.push({ type: "regular", line });
      }
    }
    if (pulpaBuffer.length > 0) result.push({ type: "pulpa", lines: pulpaBuffer });
    return result;
  }, [visibleLines]);

  const getLineProducts = (lineKey: ProductLineKey) =>
    products
      .filter((p) => p.line === lineKey && (activeSize === "todos" || p.presentation === activeSize))
      .sort((a, b) => a.presentationOrder - b.presentationOrder);

  const hasActiveFilters = hasInteracted || searchQuery !== "" || activeCategory !== DEFAULT_CATEGORY || activeSubLines.length > 0 || activeSize !== "todos";

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

  const searchResults = useMemo<{ product: Product; line: ProductLineConfig }[] | null>(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    const nq = normalizeStr(q);
    return products
      .filter((p) => {
        const line = productLines.find((l) => l.key === p.line);
        const lineLabel = pl[p.line]?.label ?? line?.label ?? "";
        const lineDes = pl[p.line]?.description ?? line?.description ?? "";
        return (
          normalizeStr(p.name).includes(nq) ||
          normalizeStr(lineLabel).includes(nq) ||
          normalizeStr(lineDes).includes(nq)
        );
      })
      .sort((a, b) => a.presentationOrder - b.presentationOrder)
      .map((p) => ({
        product: p,
        line: productLines.find((l) => l.key === p.line)!,
      }))
      .filter((item) => item.line !== undefined);
  }, [searchQuery, products, productLines, pl]);

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

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="relative max-w-md mx-auto mt-7"
          >
            <label htmlFor="catalog-search" className="sr-only">
              {dict.products.filters.search}
            </label>
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7 7 0 1116.65 16.65z" />
              </svg>
              <input
                id="catalog-search"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveCategory(DEFAULT_CATEGORY);
                  setActiveSubLines([]);
                  setActiveSize("todos");
                  setHasInteracted(false);
                }}
                placeholder={dict.products.filters.searchPlaceholder}
                className="w-full pl-11 pr-10 py-3 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white placeholder:text-white/55 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 text-sm font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label={dict.products.filters.clear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/35 text-white transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </m.div>
        </div>
      </section>

      <div ref={sentinelRef} className="h-px" />

      {/* Filtros sticky — jerarquía de 2 niveles */}
      <div
        className={`sticky z-40 border-b transition-all duration-500 ${
          isSticky ? "bg-primary-light border-primary-light shadow-md" : "bg-surface-page border-border-soft shadow-sm"
        }`}
        style={{ top: "var(--navbar-h, 92px)" }}
      >

        {/* Nivel 1 — solo categorías */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark" : "text-text-faint"}`}>
            {dict.products.filters.category}
          </span>
          {categoryOrder.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => selectCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
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
              type="button"
              onClick={() => { setActiveCategory(DEFAULT_CATEGORY); setActiveSubLines([]); setActiveSize("todos"); setHasInteracted(false); setSearchQuery(""); }}
              aria-label={dict.products.filters.clear}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-page hover:bg-red-50 text-text-faint hover:text-red-500 transition-all duration-200 hover:scale-110 ml-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
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
                            type="button"
                            key={line.key}
                            onClick={() => toggleSubLine(line.key)}
                            className={`flex shrink-0 items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
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
                  {availableSizes.length > 0 && activeSubLines.length !== 1 && (
                    <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 md:shrink-0 md:self-start md:overflow-visible md:pb-0">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 transition-colors duration-500 ${isSticky ? "text-primary-dark/70" : "text-text-faint"}`}>
                        {dict.products.filters.size}
                      </span>
                      <div className="flex gap-1.5">
                        {["todos", ...availableSizes].map((size) => (
                          <button
                            type="button"
                            key={size}
                            onClick={() => setActiveSize(size)}
                              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
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

          {/* Resultados de búsqueda por texto — override de categoría/tamaño */}
          {searchResults !== null ? (
            <m.div
              key={`search-${searchQuery}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {searchResults.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-text-faint uppercase tracking-widest mb-5">
                    {searchResults.length} {dict.products.filters.searchCount} &ldquo;{searchQuery}&rdquo;
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {searchResults.map(({ product, line }, index) => (
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
                  <EmojiIcon emoji="🔍" label="" size="xl" tone="neutral" decorative className="mb-4" />
                  <p className="text-text-muted text-base font-medium">
                    {dict.products.filters.searchEmpty} &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              )}
            </m.div>
          ) : activeSize !== "todos" ? (
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
              {segments.map((seg, segIndex) => {
                if (seg.type === "pulpa") {
                  return (
                    <m.div
                      key="pulpa-grid"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: segIndex * 0.08 }}
                    >
                      <PulpaFruitGrid
                        pulpaLines={seg.lines}
                        products={products.filter((p) => PULPA_KEYS.has(p.line))}
                        pl={pl}
                        pulpaGridDict={dict.products.pulpaGrid}
                      />
                    </m.div>
                  );
                }
                const { line } = seg;
                const lineProducts = getLineProducts(line.key);
                return (
                  <m.div
                    key={line.key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: segIndex * 0.08 }}
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
                      <ProductLineRow line={line} products={lineProducts} firstLine={segIndex === 0} />
                    )}
                  </m.div>
                );
              })}
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
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                {dict.products.cta.title}
              </h2>
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
