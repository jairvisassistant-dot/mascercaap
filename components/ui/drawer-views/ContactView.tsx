"use client";

import ContactForm from "@/components/sections/ContactForm";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Product, ProductCategory, ProductLineConfig } from "@/types";

type Props = { dict: Dictionary; lang: Locale; categories: ProductCategory[]; productLines: ProductLineConfig[]; products: Product[] };

export default function ContactView({ dict, lang, categories, productLines, products }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <ContactForm dict={dict} lang={lang} categories={categories} lines={productLines} products={products} />
    </div>
  );
}
