"use client";

import { m } from "framer-motion";
import Image from "next/image";
import { useHelpHub } from "@/lib/help-hub-context";
import type { Product } from "@/types";
import type { Dictionary } from "@/lib/i18n";

interface FeaturedProductsProps {
  products: Product[];
  dict: Dictionary;
}

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.93 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      delay: i * 0.1,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
  hover: {
    y: -10,
    scale: 1.03,
    transition: { type: "spring" as const, stiffness: 320, damping: 20 },
  },
  tap: {
    scale: 0.97,
    transition: { type: "spring" as const, stiffness: 400, damping: 28 },
  },
};

const cardStyles = [
  {
    shell: "bg-lime-100/70 ring-lime-900/10",
    core: "from-[#f7ffe6] via-white to-[#d9f3b8]",
    badge: "bg-primary text-white",
    imageGlow: "bg-lime-300/45",
  },
  {
    shell: "bg-amber-100/80 ring-amber-900/10",
    core: "from-[#fff5bf] via-white to-[#f3bc4d]",
    badge: "bg-accent text-white",
    imageGlow: "bg-amber-300/55",
  },
  {
    shell: "bg-stone-100/90 ring-stone-900/10",
    core: "from-[#fffaf0] via-white to-[#e8e0d0]",
    badge: "bg-stone-900 text-white",
    imageGlow: "bg-stone-300/45",
  },
] as const;

export default function FeaturedProducts({ products, dict }: FeaturedProductsProps) {
  const hooks = dict.home.featured.productHooks;
  const { openDrawer } = useHelpHub();

  return (
    <section className="relative overflow-hidden bg-surface-soft py-24">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_18%,rgba(229,138,34,0.16)_0%,transparent_32%),radial-gradient(circle_at_84%_12%,rgba(63,143,70,0.14)_0%,transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.56)_0%,rgba(255,248,235,0)_48%)]" />
      <div className="absolute left-0 top-12 h-px w-28 bg-primary/35 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-10 bg-accent/50 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
              {dict.home.featured.sectionLabel}
            </span>
            <span className="h-px w-10 bg-accent/50 rounded-full" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-[-0.04em] text-text-main mb-5 text-balance">
            {dict.home.featured.title}
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto leading-relaxed text-pretty">
            {dict.home.featured.subtitle}
          </p>
        </m.div>

        {products.length > 0 ? (
          <div className="grid gap-8 justify-items-center sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
            {products.map((product, index) => {
              const hook = hooks[index] ?? hooks[hooks.length - 1];
              const style = cardStyles[index % cardStyles.length];

              return (
                <m.article
                  key={product.id}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  whileHover="hover"
                  whileTap="tap"
                  custom={index}
                  viewport={{ once: true }}
                  className={`group w-full max-w-[360px] rounded-[2rem] p-2 ring-1 shadow-[0_24px_70px_rgba(35,45,30,0.12)] ${style.shell}`}
                >
                  <div className={`relative flex min-h-[520px] flex-col overflow-hidden rounded-[1.5rem] bg-gradient-to-b ${style.core} p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]`}>
                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm ${style.badge}`}>
                        {hook.badge}
                      </span>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-gray-800 shadow-sm ring-1 ring-black/5">
                        {product.presentation}
                      </span>
                    </div>

                    <div className="relative my-7 flex h-64 items-center justify-center">
                      <div className={`absolute h-44 w-44 rounded-full blur-3xl ${style.imageGlow}`} />
                      <Image
                        src={product.image}
                        alt={`${product.name} ${product.presentation}`}
                        fill
                        sizes="(max-width: 768px) 80vw, 320px"
                        priority={index === 0}
                        className="relative z-10 object-contain drop-shadow-[0_24px_34px_rgba(30,30,20,0.24)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                      />
                    </div>

                    <div className="relative z-10 mt-auto">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                        {hook.kicker}
                      </p>
                      <h3 className="text-2xl font-bold leading-tight tracking-[-0.035em] text-gray-900">
                        {product.name}
                      </h3>
                      <p className="mt-3 min-h-[3.75rem] text-sm leading-relaxed text-gray-500">
                        {hook.text}
                      </p>
                      <button
                        onClick={() => openDrawer("faq", { product: product.name })}
                        className="group mt-6 inline-flex w-full items-center justify-between rounded-full bg-gray-950 py-2 pl-5 pr-2 text-sm font-bold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary active:scale-[0.98]"
                      >
                        <span>{hook.cta}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-950 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                          ↗
                        </span>
                      </button>
                    </div>
                  </div>
                </m.article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
