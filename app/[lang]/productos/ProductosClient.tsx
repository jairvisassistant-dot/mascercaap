"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import type { Product, ProductCategory, ProductLineConfig, ProductLineKey } from "@/types";
import { PULPA_KEYS } from "./_constants";
import type { RenderSegment } from "./_constants";
import { ProductsHero } from "./ProductsHero";
import { ProductsFilterBar } from "./ProductsFilterBar";
import { ProductsContent } from "./ProductsContent";
import { WhatsAppCTABanner } from "./WhatsAppCTABanner";
import { ProductsClosingCTA } from "./ProductsClosingCTA";

const DEFAULT_CATEGORY = "todas";

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

interface ProductosClientProps {
  products: Product[];
  productLines: ProductLineConfig[];
  categories: ProductCategory[];
}

export default function ProductosClient({ products, productLines, categories }: ProductosClientProps) {
  const searchParams = useSearchParams();
  const { dict, lang } = useDictionary();

  const categoryLines = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = { todas: productLines.map((l) => l.key) };
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

  const catLabels = useMemo<Record<string, string>>(() => {
    const dictLabels = dict.footer.productLines as Record<string, string>;
    const labels: Record<string, string> = { todas: dictLabels.todas ?? "Todas" };
    for (const cat of categories) {
      labels[cat.key] = dictLabels[cat.key] ?? cat.label;
    }
    return labels;
  }, [categories, dict]);

  const catFromUrl = searchParams.get("categoria") ?? DEFAULT_CATEGORY;
  const [activeCategory, setActiveCategory] = useState<string>(catFromUrl);
  const [activeSubLines, setActiveSubLines] = useState<ProductLineKey[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [activeSize, setActiveSize] = useState<string>("todos");
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sync URL param changes to local state during render (derived state, not effect)
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

  const availableSizes = useMemo(() => {
    const relevantLines = activeSubLines.length > 0
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

  const catIndex = useMemo(() => {
    const idx: Record<string, number> = {};
    categories.forEach((cat, i) => { idx[cat.key] = i; });
    return idx;
  }, [categories]);

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
    }),
  [productLines, activeCategory, activeSubLines, categoryLines, catIndex, categories.length]);

  const categorySubLines = useMemo(() => productLines.filter(
    (l) => categoryLines[activeCategory]?.includes(l.key)
  ), [productLines, activeCategory, categoryLines]);

  const showSubFilter = activeCategory !== "todas" && categorySubLines.length > 1;

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
      .map((p) => ({ product: p, line: productLines.find((l) => l.key === p.line)! }))
      .filter((item) => item.line !== undefined);
  }, [searchQuery, products, productLines, pl]);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setActiveCategory(DEFAULT_CATEGORY);
    setActiveSubLines([]);
    setActiveSize("todos");
    setHasInteracted(false);
  }

  function selectCategory(cat: string) {
    if (activeCategory !== cat) {
      setActiveCategory(cat);
      setActiveSubLines([]);
      setActiveSize("todos");
    }
    setHasInteracted(true);
  }

  function toggleSubLine(key: ProductLineKey) {
    setActiveSubLines((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
    setActiveSize("todos");
  }

  function clearAll() {
    setActiveCategory(DEFAULT_CATEGORY);
    setActiveSubLines([]);
    setActiveSize("todos");
    setHasInteracted(false);
    setSearchQuery("");
  }

  return (
    <div className="pt-20">
      <ProductsHero
        dict={dict}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={() => setSearchQuery("")}
      />

      <div ref={sentinelRef} className="h-px" />

      <ProductsFilterBar
        dict={dict}
        isSticky={isSticky}
        categoryOrder={categoryOrder}
        catLabels={catLabels}
        activeCategory={activeCategory}
        hasInteracted={hasInteracted}
        showSubFilter={showSubFilter}
        categorySubLines={categorySubLines}
        activeSubLines={activeSubLines}
        availableSizes={availableSizes}
        activeSize={activeSize}
        hasActiveFilters={hasActiveFilters}
        pl={pl}
        onSelectCategory={selectCategory}
        onToggleSubLine={toggleSubLine}
        onSelectSize={setActiveSize}
        onClearAll={clearAll}
      />

      <section className="py-10 bg-surface-page min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4">
          <ProductsContent
            dict={dict}
            lang={lang}
            pl={pl}
            searchQuery={searchQuery}
            searchResults={searchResults}
            activeSize={activeSize}
            sizeFilteredItems={sizeFilteredItems}
            segments={segments}
            products={products}
          />
        </div>
      </section>

      <WhatsAppCTABanner lang={lang} />
      <ProductsClosingCTA dict={dict} lang={lang} />
    </div>
  );
}
