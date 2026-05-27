import { AnimateInView } from "@/components/ui/motion/AnimateInView"
import { ProductsSearchInput } from "./ProductsSearchInput"
import type { Dictionary } from "@/lib/i18n"

type Props = {
  dict: Dictionary
  searchQuery: string
  onSearchChange: (q: string) => void
  onClearSearch: () => void
}

export function ProductsHero({ dict, searchQuery, onSearchChange, onClearSearch }: Props) {
  return (
    <section className="relative bg-gradient-to-br from-primary-dark via-primary to-[#5f9f63] py-16 overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      <div className="absolute right-0 inset-y-0 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto opacity-[0.07]" fill="white">
          <path d="M380 0 C240 20 120 80 80 160 C40 240 120 300 220 280 C320 260 420 180 400 80 Z" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 text-center text-white relative z-10">
        <AnimateInView direction="up" delay={0}>
          <p className="text-xs font-bold tracking-widest text-white/60 uppercase mb-4">
            {dict.products.hero.eyebrow}
          </p>
        </AnimateInView>

        <AnimateInView direction="up" delay={0.05}>
          <h1 className="font-dm-serif text-4xl md:text-6xl mb-4 leading-tight">
            {dict.products.hero.title}
          </h1>
        </AnimateInView>

        <AnimateInView direction="up" delay={0.1}>
          <p className="text-xl opacity-85 max-w-2xl mx-auto">
            {dict.products.hero.subtitle}
          </p>
        </AnimateInView>

        <AnimateInView direction="up" delay={0.18}>
          <ProductsSearchInput
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onClearSearch={onClearSearch}
            dict={dict}
          />
        </AnimateInView>
      </div>
    </section>
  )
}
