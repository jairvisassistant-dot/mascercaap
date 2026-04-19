"use client";

import { m } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

type CategoryStructure = {
  key: string;
  image: string;
  href: string;
  comingSoon?: boolean;
};

const CATEGORIES: CategoryStructure[] = [
  {
    key: "jugos",
    image: "/imgs/SKU_LimonCereza1000.webp",
    href: "/productos?categoria=jugos",
  },
  {
    key: "pulpas",
    image: "/imgs/pulpa-mora.webp",
    href: "/productos?categoria=pulpas",
  },
  {
    key: "lacteos",
    image: "/imgs/Kumis-Hato.webp",
    href: "/productos?categoria=lacteos",
  },
];

export default function ProductCategories() {
  const { dict, lang } = useDictionary();

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {dict.home.categories.title}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {dict.home.categories.subtitle}
          </p>
        </m.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIES.map((category, index) => (
            <m.div
              key={category.key}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <CategoryCard
                category={category}
                text={dict.home.categories.items[index]}
                comingSoonLabel={dict.home.categories.comingSoon}
                viewProductsLabel={dict.home.categories.viewProducts}
                lang={lang}
                priority={index === 0}
              />
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  category,
  text,
  comingSoonLabel,
  viewProductsLabel,
  lang,
  priority = false,
}: {
  category: CategoryStructure;
  text: { label: string; description: string };
  comingSoonLabel: string;
  viewProductsLabel: string;
  lang: string;
  priority?: boolean;
}) {
  const inner = (
    <div className="relative h-96 rounded-2xl overflow-hidden group">
      <Image
        src={category.image}
        alt={text.label}
        fill
        className={`object-cover transition-transform duration-700 ${
          category.comingSoon ? "brightness-75" : "group-hover:scale-105"
        }`}
        sizes="(max-width: 768px) 100vw, 33vw"
        loading={priority ? "eager" : "lazy"}
        priority={priority}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

      {category.comingSoon && (
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      )}

      {category.comingSoon && (
        <div className="absolute top-4 right-4 bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full">
          {comingSoonLabel}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="text-white text-2xl font-bold mb-2">{text.label}</h3>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          {text.description}
        </p>
        {!category.comingSoon && (
          <span className="inline-flex items-center gap-2 text-white text-sm font-semibold border-b border-white/40 pb-0.5 transition-all group-hover:border-white group-hover:gap-3">
            {viewProductsLabel}
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  if (category.comingSoon) {
    return <div className="cursor-default">{inner}</div>;
  }

  return (
    <Link href={`/${lang}${category.href}`} className="block">
      {inner}
    </Link>
  );
}
