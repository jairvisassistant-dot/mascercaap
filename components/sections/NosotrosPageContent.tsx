"use client";

import { m } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import MisionVisionTabs from "@/components/sections/MisionVisionTabs";
import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Dictionary } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const timelineIcons = ["🌱", "👀", "🚿", "🧃", "🫙", "📦"];

const processSteps = [
  { src: "/imgs/Naranja-Seleccion.webp", alt: "Selección de naranjas al amanecer", icon: "🌅" },
  { src: "/imgs/Naranja-Compra.webp", alt: "Compra directa al campesino colombiano", icon: "🤝" },
  { src: "/imgs/Naranja-Tiene-Juez.webp", alt: "Control de calidad e inspección de fruta", icon: "🔍" },
  { src: "/imgs/Naranja-Frio.webp", alt: "Proceso artesanal de exprimido en frío", icon: "🧃" },
  { src: "/imgs/Naranja-Frescuras.webp", alt: "Embotellado fresco de jugo de naranja", icon: "✨" },
  { src: "/imgs/Naranja-Detras-Cada-Botella.webp", alt: "Fundadoras de Más Cerca AP trabajando", icon: "💚" },
];

const valuesMeta = [
  { icon: "🙏", color: "from-primary to-primary-dark" },
  { icon: "🤝", color: "from-accent to-accent-dark" },
  { icon: "⭐", color: "from-primary-dark to-[#1B5E20]" },
  { icon: "🌱", color: "from-accent-light to-accent-dark" },
];

export default function NosotrosPageContent({ dict, lang }: { dict: Dictionary; lang: string }) {
  const t = dict.about;

  return (
    <div className="pt-20">

      {/* Hero — el verde del campo colombiano, sin mezcla con naranja */}
      <section className="relative py-20 bg-gradient-to-br from-primary-dark via-primary to-[#5f9f63] overflow-hidden">
        {/* Luz solar filtrada — evoca amanecer sobre el campo */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent/10 blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        {/* Forma orgánica — hoja */}
        <div className="absolute right-0 inset-y-0 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto opacity-[0.07]" fill="white">
            <path d="M380 0 C240 20 120 80 80 160 C40 240 120 300 220 280 C320 260 420 180 400 80 Z" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center text-white relative z-10">
          <m.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold tracking-widest text-white/60 uppercase mb-5"
          >
            {`Chía · ${SITE_CONFIG.addressCity}`}
          </m.p>
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-dm-serif text-4xl md:text-6xl mb-4 leading-tight"
          >
            {t.hero.title}
          </m.h1>
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl opacity-85 max-w-2xl mx-auto"
          >
            {t.hero.subtitle}
          </m.p>
        </div>
      </section>

      {/* Historia */}
      <section className="py-20 bg-surface-page">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <m.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="inline-block text-xs font-bold tracking-widest text-primary uppercase mb-4">
                {t.history.title}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-text-main leading-tight mb-6">
                {t.history.headline.prefix}{" "}
                <em className="not-italic text-primary">{t.history.headline.highlight}</em>{" "}
                {t.history.headline.suffix}
              </h2>
              <p className="text-text-muted leading-relaxed text-justify">{t.history.text}</p>
            </m.div>
            <m.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
              <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image src="/imgs/QuieneSomos.webp" alt={t.history.imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Timeline — "Del Campo a Tu Mesa": el campo es verde, la historia empieza aquí */}
      <section className="py-20 bg-gradient-to-b from-surface-page to-emerald-50/60">
        <div className="max-w-7xl mx-auto px-4">
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-primary/60 uppercase mb-3">
              {t.timeline.sectionLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">{t.timeline.title}</h2>
            <p className="text-text-muted max-w-2xl mx-auto">{t.timeline.subtitle}</p>
          </m.div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {t.timeline.steps.map((step, index) => (
              <m.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="relative mx-auto mb-4 w-20 h-20">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-4xl shadow-lg shadow-primary/20">
                    <EmojiIcon emoji={timelineIcons[index]} label={step.title} size="xl" tone="plain" />
                  </div>
                  {index < t.timeline.steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-full w-full h-px bg-primary/20" />
                  )}
                </div>
                <h3 className="font-bold text-text-main mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* Misión & Visión */}
      <MisionVisionTabs dict={dict} />

      {/* Valores — lo que mueve a Más Cerca AP, expresado en verde y naranja de marca */}
      <section className="py-20 bg-surface-page">
        <div className="max-w-7xl mx-auto px-4">
          <m.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block text-sm font-semibold tracking-widest text-accent uppercase mb-3">{t.values.subtitle}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-text-main">{t.values.title}</h2>
          </m.div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {t.values.items.map((value, index) => (
              <m.div key={index} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.12 }} whileHover={{ y: -6 }} className="group bg-surface-card rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${valuesMeta[index].color}`} />
                <div className="p-8">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${valuesMeta[index].color} flex items-center justify-center shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <EmojiIcon emoji={valuesMeta[index].icon} label={value.title} size="md" tone="plain" />
                  </div>
                  <h3 className="text-xl font-bold text-text-main mb-3">{value.title}</h3>
                  <p className="text-text-muted leading-relaxed">{value.description}</p>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trayectoria */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          {/* Header */}
          <m.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase mb-3">
              {t.trayectoria.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">{t.trayectoria.title}</h2>
          </m.div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-emerald-800" />
              <div className="flex flex-col gap-10">
                {t.trayectoria.milestones.map((milestone, i) => (
                  <m.div
                    key={milestone.year}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                    className="flex gap-6 items-start"
                  >
                    <div className="relative flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-primary border-4 border-emerald-900 shadow-lg shadow-primary/40" />
                    </div>
                    <div>
                      <span className="text-primary font-bold text-lg block mb-1">{milestone.year}</span>
                      <p className="text-gray-300 text-sm leading-relaxed">{milestone.text}</p>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <m.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-8"
            >
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block mb-8">
                {t.trayectoria.stats.label}
              </span>
              <div className="flex flex-col divide-y divide-white/10">
                {t.trayectoria.stats.items.map((item, i) => (
                  <m.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center justify-between py-5"
                  >
                    <span className="text-4xl font-bold text-primary">{item.value}</span>
                    <span className="text-gray-400 text-sm text-right max-w-[140px]">{item.description}</span>
                  </m.div>
                ))}
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Proceso en Imágenes — timeline vertical alternado */}
      <section className="py-20 bg-surface-page overflow-hidden">
        <div className="max-w-5xl mx-auto px-4">
          <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-block text-xs font-bold tracking-widest text-primary/60 uppercase mb-3">
              {t.gallery.sectionLabel}
            </span>
            <h2 className="font-dm-serif text-3xl md:text-4xl text-primary mb-4">{t.gallery.title}</h2>
            <p className="text-text-muted max-w-xl mx-auto">{t.gallery.subtitle}</p>
          </m.div>

          {/* Timeline */}
          <div className="relative">
            {/* Línea vertical central — solo desktop */}
            <div className="hidden md:block absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

            <div className="flex flex-col gap-20">
              {processSteps.map((step, index) => {
                const isEven = index % 2 === 0;
                const cardText = t.gallery.cards[index];
                return (
                  <m.div
                    key={index}
                    initial={{ opacity: 0, y: 48 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="grid md:grid-cols-[1fr_80px_1fr] items-center gap-6 md:gap-0"
                  >
                    {/* Imagen */}
                    <div className={`relative h-64 md:h-72 rounded-2xl overflow-hidden shadow-lg group ${isEven ? "md:order-1" : "md:order-3"}`}>
                      <Image
                        src={step.src}
                        alt={cardText.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 42vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                    </div>

                    {/* Dot central */}
                    <div className="hidden md:flex md:order-2 justify-center">
                      <m.div
                        initial={{ scale: 0, rotate: -20 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.18 }}
                        className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-2xl shadow-xl shadow-primary/25 z-10 relative"
                      >
                        <EmojiIcon emoji={step.icon} label={cardText.title} size="md" tone="plain" />
                      </m.div>
                    </div>

                    {/* Contenido */}
                    <div className={`md:px-8 ${isEven ? "md:order-3" : "md:order-1 md:text-right"}`}>
                      <EmojiIcon emoji={step.icon} label={cardText.title} size="lg" tone="service" className="mb-3 md:hidden" />
                      <span className="inline-block text-[10px] font-bold tracking-widest text-primary/60 uppercase mb-2">
                        {`${t.gallery.stepLabel} ${index + 1} ${t.gallery.stepOf} ${processSteps.length}`}
                      </span>
                      <h3 className="font-dm-serif text-2xl md:text-[1.6rem] text-text-main mb-3 leading-snug">
                        {cardText.title}
                      </h3>
                      <p className="text-text-muted leading-relaxed text-sm md:text-base">
                        {cardText.body}
                      </p>
                    </div>
                  </m.div>
                );
              })}
            </div>
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
