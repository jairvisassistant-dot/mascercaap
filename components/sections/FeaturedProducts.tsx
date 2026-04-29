"use client";

import { m } from "framer-motion";
import ProductCard from "@/components/ui/ProductCard";
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

export default function FeaturedProducts({ products, dict }: FeaturedProductsProps) {
  return (
    <section className="py-24 bg-[#f8faf8]">
      <div className="max-w-7xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-10 bg-accent/50 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
              {dict.home.featured.sectionLabel}
            </span>
            <span className="h-px w-10 bg-accent/50 rounded-full" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {dict.home.featured.title}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {dict.home.featured.subtitle}
          </p>
        </m.div>

        {products.length > 0 ? (
          <div className="grid gap-8 justify-items-center sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
            {products.map((product, index) => (
            <m.div
              key={product.id}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              whileTap="tap"
              custom={index}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <ProductCard product={product} priority={index === 0} />
            </m.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
