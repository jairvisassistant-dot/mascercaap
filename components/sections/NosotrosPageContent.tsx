"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import MisionVisionTabs from "@/components/sections/MisionVisionTabs";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

const timelineIcons = ["🌱", "👀", "🚿", "🧃", "🫙", "📦"];

const valuesMeta = [
  { icon: "🙏", color: "from-amber-400 to-yellow-600" },
  { icon: "🤝", color: "from-teal-400 to-emerald-600" },
  { icon: "⭐", color: "from-green-400 to-green-600" },
  { icon: "🌱", color: "from-orange-400 to-orange-600" },
];

const flipCardsMeta = [
  { src: "/imgs/Naranja-Seleccion.webp", alt: "Selección de naranjas al amanecer", icon: "🌅" },
  { src: "/imgs/Naranja-Compra.webp", alt: "Compra directa al campesino colombiano", icon: "🤝" },
  { src: "/imgs/Naranja-Tiene-Juez.webp", alt: "Control de calidad e inspección de fruta", icon: "🔍" },
  { src: "/imgs/Naranja-Frio.webp", alt: "Proceso artesanal de exprimido en frío", icon: "🧃" },
  { src: "/imgs/Naranja-Frescuras.webp", alt: "Embotellado fresco de jugo de naranja", icon: "✨" },
  { src: "/imgs/Naranja-Detras-Cada-Botella.webp", alt: "Fundadoras de Más Cerca AP trabajando", icon: "💚" },
];

function FlipCard({ card, cardText, pressMore, pressBack, index }: {
  card: typeof flipCardsMeta[0];
  cardText: { title: string; body: string };
  pressMore: string;
  pressBack: string;
  index: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const [hinted, setHinted] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || hinted) return;
    const peekDelay = setTimeout(() => {
      setFlipped(true);
      returnRef.current = setTimeout(() => {
        setFlipped(false);
        setHinted(true);
      }, 1100);
    }, 800 + index * 280);
    return () => {
      clearTimeout(peekDelay);
      if (returnRef.current) clearTimeout(returnRef.current);
    };
  }, [isInView, hinted, index]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="relative h-48 md:h-64 w-full [perspective:1000px] cursor-pointer group text-left"
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={handleKeyDown}
      aria-label={cardText.title}
      aria-pressed={flipped}
    >
      <div
        className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl overflow-hidden shadow-lg">
          <Image src={card.src} alt={card.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            <p className="text-white font-bold text-sm md:text-base leading-tight drop-shadow-md">{cardText.title}</p>
            <p className="text-white/70 text-[10px] md:text-xs mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {pressMore}
            </p>
          </div>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center p-5 text-center gap-3">
          <span className="text-4xl">{card.icon}</span>
          <h3 className="text-white font-bold text-base md:text-lg leading-tight">{cardText.title}</h3>
          <p className="text-white/85 text-xs md:text-sm leading-relaxed">{cardText.body}</p>
          <span className="text-white/50 text-[10px] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {pressBack}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default function NosotrosPageContent() {
  const { dict, lang } = useDictionary();
  const t = dict.about;

  return (
    <div className="pt-20">

      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-r from-primary to-accent">
        <div className="max-w-7xl mx-auto px-4 text-center text-white">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold mb-4">
            {t.hero.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xl opacity-90 max-w-2xl mx-auto">
            {t.hero.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Historia */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">{t.history.title}</h2>
              <p className="text-gray-600 leading-relaxed text-justify">{t.history.text}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
              <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image src="/imgs/QuieneSomos.webp" alt={t.history.imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">{t.timeline.title}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t.timeline.subtitle}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {t.timeline.steps.map((step, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">{timelineIcons[index]}</div>
                <h3 className="font-bold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Misión & Visión */}
      <MisionVisionTabs />

      {/* Valores */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block text-sm font-semibold tracking-widest text-accent uppercase mb-3">{t.values.subtitle}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{t.values.title}</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {t.values.items.map((value, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.12 }} whileHover={{ y: -6 }} className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${valuesMeta[index].color}`} />
                <div className="p-8">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${valuesMeta[index].color} flex items-center justify-center text-2xl shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>{valuesMeta[index].icon}</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{value.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Galería de Proceso */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">{t.gallery.title}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t.gallery.subtitle}</p>
          </motion.div>
          <p className="md:hidden flex items-center justify-center gap-2 text-sm text-gray-500 italic mb-6">
            <span className="text-lg">👆</span>
            {t.gallery.mobileHint}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {flipCardsMeta.map((card, index) => (
              <FlipCard key={index} card={card} cardText={t.gallery.cards[index]} pressMore={t.gallery.pressMore} pressBack={t.gallery.pressBack} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.cta.title}</h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">{t.cta.text}</p>
          <Link href={`/${lang}/contacto`} className="inline-block bg-white text-primary font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-all hover:scale-105">
            {t.cta.button}
          </Link>
        </div>
      </section>
    </div>
  );
}
