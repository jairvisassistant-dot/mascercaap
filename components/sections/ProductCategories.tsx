"use client";

import { m } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Dictionary } from "@/lib/i18n";

const cardVariants = {
  hidden: { opacity: 0, y: 56, scale: 0.94 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      delay: i * 0.14,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
  hover: {
    y: -10,
    transition: { type: "spring" as const, stiffness: 320, damping: 22 },
  },
  tap: {
    scale: 0.975,
    transition: { type: "spring" as const, stiffness: 400, damping: 28 },
  },
};

type CategoryStructure = {
  key: string;
  image: string;
  href: string;
  gradient: string;
  glowColor: string;
  emoji: string;
  imageContainerClass?: string;
  comingSoon?: boolean;
};

const CATEGORIES: CategoryStructure[] = [
  {
    key: "jugos",
    image: "/imgs/SKU_Limon-Portada.png",
    href: "/productos?categoria=jugos",
    gradient: "from-[#dcefc5] via-[#8fbd68] to-[#3f7f4a]",
    glowColor: "bg-lime-100/24",
    emoji: "🍋",
    imageContainerClass: "w-56 h-80",
  },
  {
    key: "pulpas",
    image: "/imgs/pulpas-portada-test.png",
    href: "/productos?categoria=pulpas",
    gradient: "from-[#f47f22] via-[#f59a24] to-[#f2bd54]",
    glowColor: "bg-orange-100/24",
    emoji: "🍓",
  },
  {
    key: "lacteos",
    image: "/imgs/lacteos_Portada.png",
    href: "/productos?categoria=lacteos",
    gradient: "from-[#153f3a] via-[#276357] to-[#6f967f]",
    glowColor: "bg-stone-100/20",
    emoji: "🥛",
  },
];

export default function ProductCategories({ dict, lang }: { dict: Dictionary; lang: string }) {

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-10 bg-primary/40 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
              {dict.home.categories.sectionLabel}
            </span>
            <span className="h-px w-10 bg-primary/40 rounded-full" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {dict.home.categories.title}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {dict.home.categories.subtitle}
          </p>
        </m.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIES.map((category, index) => (
            <m.div
              key={category.key}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              whileHover={category.comingSoon ? undefined : "hover"}
              whileTap={category.comingSoon ? undefined : "tap"}
              custom={index}
              viewport={{ once: true }}
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
    <div className="rounded-[1.35rem] bg-[#f7f1e6] p-1.5 ring-1 ring-black/5">
    <div className={`relative h-96 rounded-[1.1rem] overflow-hidden group bg-gradient-to-br ${category.gradient} shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]`}>

      {/* Glow decorativo detrás de la imagen */}
      <div className={`absolute -bottom-8 -right-8 w-64 h-64 rounded-full blur-3xl ${category.glowColor} pointer-events-none`} />

      {/* Puntos decorativos */}
      <div className="absolute top-4 right-4 opacity-20 pointer-events-none">
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>
      </div>

      {/* Imagen del producto — derecha inferior */}
      <div className={`absolute ${category.imageContainerClass ? "bottom-4" : "bottom-0"} right-0 ${category.imageContainerClass ?? "w-48 h-72"} pointer-events-none`}>
        {/* Degradado lateral que absorbe el borde de la imagen */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[inherit] via-transparent to-transparent" />
        <Image
          src={category.image}
          alt={text.label}
          fill
          className={`object-contain object-bottom transition-transform duration-700 drop-shadow-2xl ${
            !category.comingSoon ? "group-hover:scale-105 group-hover:-translate-y-2" : "brightness-75"
          }`}
          sizes="(max-width: 768px) 50vw, 20vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
        />
      </div>

      {/* Degradado desde la izquierda para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-emerald-950/8 to-transparent pointer-events-none" />

      {/* Blur si comingSoon */}
      {category.comingSoon && (
        <div className="absolute inset-0 backdrop-blur-[2px] z-20" />
      )}

      {/* Badge comingSoon */}
      {category.comingSoon && (
        <div className="absolute top-4 right-4 z-30 bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full">
          {comingSoonLabel}
        </div>
      )}

      {/* Contenido de texto — izquierda */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
        {/* Emoji + label tag arriba */}
        <div className="flex items-center gap-2">
          <EmojiIcon emoji={category.emoji} label={text.label} size="sm" tone="fruit" />
          <span className="text-white/70 text-xs font-bold tracking-widest uppercase">
            {text.label}
          </span>
        </div>

        {/* Título y descripción abajo a la izquierda */}
        <div className="max-w-[55%]">
          <h3 className="text-white text-2xl font-bold mb-2 leading-tight">
            {text.label}
          </h3>
          <p className="text-white/75 text-xs leading-relaxed mb-4 line-clamp-3">
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
