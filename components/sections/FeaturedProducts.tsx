"use client";

import { m } from "framer-motion";
import ProductCard from "@/components/ui/ProductCard";
import type { Product } from "@/types";
import type { Dictionary } from "@/lib/i18n";

interface FeaturedProductsProps {
  products: Product[];
  dict: Dictionary;
}

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
              Destacados
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {products.map((product, index) => (
            <m.div
              key={product.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <ProductCard product={product} />
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
