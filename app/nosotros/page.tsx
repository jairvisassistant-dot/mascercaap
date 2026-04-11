"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const timelineSteps = [
  {
    icon: "🌱",
    title: "Cultivo",
    description: "Seleccionamos las mejores frutas de proveedores locales en Cundinamarca.",
  },
  {
    icon: "👀",
    title: "Selección",
    description: "Inspeccionamos cada fruta para garantizar solo la mejor calidad.",
  },
  {
    icon: "🚿",
    title: "Lavado",
    description: "Lavado profundo con agua purificada para máxima higiene.",
  },
  {
    icon: "🧃",
    title: "Exprimido",
    description: "Expresión en frío para preservar vitaminas y nutrientes.",
  },
  {
    icon: "🫙",
    title: "Embotellado",
    description: "Envasado esterilizado para mantener la frescura.",
  },
  {
    icon: "📦",
    title: "Entrega",
    description: "Distribución en toda Bogotá en menos de 24 horas.",
  },
];

const misionVision = {
  mision: {
    label: "Misión",
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" />
        <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="5" fill="currentColor" />
      </svg>
    ),
    bgFrom: "#4CAF50",
    bgTo: "#2E7D32",
    accentColor: "#A5D6A7",
    title: "Nuestra Misión",
    text: "En Más Cerca AP producimos y comercializamos jugos, pulpas y productos frescos de origen colombiano, comprando directamente al campesino y distribuyendo para pequeños productores, porque creemos que el comercio justo y el servicio genuino pueden transformar vidas. Somos la plataforma que lleva productos del campo a hogares, negocios y mercados nacionales e internacionales, con transparencia, calidad y fe como guía.",
  },
  vision: {
    label: "Visión",
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
        <path d="M4 32C4 32 14 12 32 12C50 12 60 32 60 32C60 32 50 52 32 52C14 52 4 32 4 32Z" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
      </svg>
    ),
    bgFrom: "#FF9800",
    bgTo: "#E65100",
    accentColor: "#FFCC80",
    title: "Nuestra Visión",
    text: "En el corto y mediano plazo, Más Cerca AP será cada vez más fiel a su nombre: una empresa que sigue acercando el campo al mundo, los productores a nuevos mercados y los productos colombianos a nuevas fronteras. Creceremos siendo la plataforma que impulsa el crecimiento de otros, expandiéndonos por Latinoamérica y mirando hacia Europa, fieles a nuestra razón de ser: servir con amor, honestidad y fe en Dios como nuestro fundamento.",
  },
};

const values = [
  {
    icon: "🙏",
    title: "Fe y Compromiso",
    description: "Todo lo que somos nace del amor a Dios y a las personas.",
    color: "from-violet-400 to-purple-600",
  },
  {
    icon: "🤝",
    title: "Servicio Genuino",
    description: "Servir a la gente no es lo que hacemos: es por lo qué existimos.",
    color: "from-sky-400 to-blue-600",
  },
  {
    icon: "⭐",
    title: "Calidad",
    description: "La calidad en Más Cerca AP no viene de una certificación sino de la convicción de que la gente merece lo mejor.",
    color: "from-green-400 to-green-600",
  },
  {
    icon: "🌱",
    title: "Impacto Social",
    description: "Crecer está bien. Crecer impulsando el crecimiento de otros es mejor.",
    color: "from-orange-400 to-orange-600",
  },
];

export default function NosotrosPage() {
  const [activeTab, setActiveTab] = useState<"mision" | "vision">("mision");
  const active = misionVision[activeTab];

  return (
    <div className="pt-20">
        {/* Hero */}
        <section className="relative py-20 bg-gradient-to-r from-primary to-accent">
          <div className="max-w-7xl mx-auto px-4 text-center text-white">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Sobre Nosotros
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl opacity-90 max-w-2xl mx-auto"
            >
              Conoce la historia detrás de Mas Cerca Ap y nuestro compromiso 
              con la frescura y calidad.
            </motion.p>
          </div>
        </section>

        {/* Historia */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold text-gray-800 mb-6">
                  Nuestra Historia
                </h2>
                <p className="text-gray-600 leading-relaxed text-justify">
                  Somos Más Cerca AP, una empresa colombiana fundada por una pareja
                  que creyó que servir a la gente era la mejor forma de emprender.
                  Producimos y comercializamos jugos, pulpas y productos frescos de
                  origen directo, comprando a los campesinos en finca y siendo la
                  plataforma que lleva sus productos a hogares, negocios y nuevos mercados.
                  Nos mueve la fe en Dios, nos guía la honestidad y nos define el
                  compromiso con el campo colombiano.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="/imgs/QuieneSomos.png"
                    alt="Quiénes somos - Más Cerca AP"
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Process Timeline */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Del Campo a Tu Mesa
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Nuestro proceso artesanal garantiza la máxima frescura y calidad 
                en cada jugo que producimos.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
              {timelineSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {index < timelineSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-primary/30" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Misión & Visión ── */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-5xl mx-auto px-4">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-block text-sm font-semibold tracking-widest text-primary uppercase mb-3">
                Quiénes somos
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                Misión &amp; Visión
              </h2>
            </motion.div>

            {/* Tab Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex justify-center mb-10"
            >
              <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-inner">
                {(["mision", "vision"] as const).map((tab) => {
                  const isActive = activeTab === tab;
                  const cfg = misionVision[tab];
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                        isActive ? "text-white shadow-md" : "text-gray-500 hover:text-gray-700"
                      }`}
                      style={isActive ? { background: `linear-gradient(135deg, ${cfg.bgFrom}, ${cfg.bgTo})` } : {}}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Animated Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="relative rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${active.bgFrom}, ${active.bgTo})` }}
              >
                {/* Decorative blobs */}
                <div
                  className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 blur-3xl"
                  style={{ background: active.accentColor }}
                />
                <div
                  className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-20 blur-3xl"
                  style={{ background: active.accentColor }}
                />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 p-10 md:p-14">
                  {/* Icon */}
                  <div
                    className="shrink-0 w-28 h-28 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                  >
                    {active.icon}
                  </div>

                  {/* Text */}
                  <div className="text-white">
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">{active.title}</h3>
                    <p className="text-white/85 text-lg leading-relaxed max-w-2xl text-justify">
                      {active.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ── Valores ── */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <span className="inline-block text-sm font-semibold tracking-widest text-accent uppercase mb-3">
                Lo que nos guía
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                Nuestros Valores
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12 }}
                  whileHover={{ y: -6 }}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                >
                  {/* Top accent bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${value.color}`} />

                  <div className="p-8">
                    {/* Icon bubble */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center text-2xl shadow-md mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      {value.icon}
                    </div>

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
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Nuestro Proceso en Imágenes
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Una mirada detrás de escenas a cómo preparamos cada jugo.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                "https://images.unsplash.com/photo-1587581152853-8e2c81d96d9f?w=600&q=80",
                "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80",
                "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80",
                "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80",
                "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80",
                "https://images.unsplash.com/photo-1595981234058-f93a7d97c2de?w=600&q=80",
              ].map((src, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-lg"
                >
                  <Image
                    src={src}
                    alt={`Proceso ${index + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Quieres probar nuestros productos?
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Contáctanos y descubre por qué somos la opción favorita de tantos 
              bogotanos.
            </p>
            <Link
              href="/contacto"
              className="inline-block bg-white text-primary font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-all hover:scale-105"
            >
              Contáctanos
            </Link>
          </div>
        </section>
    </div>
  );
}