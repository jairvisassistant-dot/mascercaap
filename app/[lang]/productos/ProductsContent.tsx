import { AnimateInView } from "@/components/ui/motion/AnimateInView"
import ProductGridCard from "@/components/ui/ProductGridCard"
import ProductLineRow from "@/components/ui/ProductLineRow"
import PulpaFruitGrid from "@/components/ui/PulpaFruitGrid"
import EmojiIcon from "@/components/ui/EmojiIcon"
import type { Dictionary } from "@/lib/i18n"
import type { Product, ProductLineConfig } from "@/types"
import type { RenderSegment } from "@/lib/productos/constants"
import { PULPA_KEYS } from "@/lib/productos/constants"

type Props = {
  dict: Dictionary
  lang: string
  pl: Record<string, { label: string; description: string }>
  searchQuery: string
  searchResults: { product: Product; line: ProductLineConfig }[] | null
  activeSize: string
  sizeFilteredItems: { product: Product; line: ProductLineConfig }[]
  segments: RenderSegment[]
  products: Product[]
}

export function ProductsContent({
  dict, lang, pl, searchQuery, searchResults, activeSize, sizeFilteredItems, segments, products,
}: Props) {
  const pulpaProducts = products.filter((p) => PULPA_KEYS.has(p.line))

  if (searchResults !== null) {
    return (
      <AnimateInView
        key={`search-${searchQuery}`}
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
                  dict={dict}
                  lang={lang}
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
      </AnimateInView>
    )
  }

  if (activeSize !== "todos") {
    return (
      <AnimateInView
        key={`grid-${activeSize}`}
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
                  dict={dict}
                  lang={lang}
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
      </AnimateInView>
    )
  }

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <EmojiIcon emoji="🛒" label="" size="xl" tone="neutral" decorative className="mb-4" />
        <p className="text-text-muted text-base font-medium">
          {dict.products.filters.empty}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-12">
      {segments.map((seg, segIndex) => {
        if (seg.type === "pulpa") {
          return (
            <AnimateInView
              key="pulpa-grid"
              delay={segIndex * 0.08}
            >
              <PulpaFruitGrid
                pulpaLines={seg.lines}
                products={pulpaProducts}
                pl={pl}
                pulpaGridDict={dict.products.pulpaGrid}
                dict={dict}
                lang={lang}
              />
            </AnimateInView>
          )
        }

        const { line } = seg
        return (
          <AnimateInView
            key={line.key}
            delay={segIndex * 0.08}
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
            <ProductLineRow line={line} products={
              products
                .filter((p) => p.line === line.key && (activeSize === "todos" || p.presentation === activeSize))
                .sort((a, b) => a.presentationOrder - b.presentationOrder)
            } firstLine={segIndex === 0} dict={dict} lang={lang} />
          </AnimateInView>
        )
      })}
    </div>
  )
}
