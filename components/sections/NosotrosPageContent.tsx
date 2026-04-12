"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import MisionVisionTabs from "@/components/sections/MisionVisionTabs";

const timelineSteps = [
  { icon: "🌱", title: "Cultivo",     description: "Seleccionamos las mejores frutas de proveedores locales en Cundinamarca." },
  { icon: "👀", title: "Selección",   description: "Inspeccionamos cada fruta para garantizar solo la mejor calidad." },
  { icon: "🚿", title: "Lavado",      description: "Lavado profundo con agua purificada para máxima higiene." },
  { icon: "🧃", title: "Exprimido",   description: "Expresión en frío para preservar vitaminas y nutrientes." },
  { icon: "🫙", title: "Embotellado", description: "Envasado esterilizado para mantener la frescura." },
  { icon: "📦", title: "Entrega",     description: "Distribución en toda Bogotá en menos de 24 horas." },
];

const values = [
  { icon: "🙏", title: "Fe y Compromiso",   description: "Todo lo que somos nace del amor a Dios y a las personas.",                                                          color: "from-violet-400 to-purple-600" },
  { icon: "🤝", title: "Servicio Genuino",   description: "Servir a la gente no es lo que hacemos: es por lo qué existimos.",                                                 color: "from-sky-400 to-blue-600"     },
  { icon: "⭐", title: "Calidad",            description: "La calidad en Más Cerca AP no viene de una certificación sino de la convicción de que la gente merece lo mejor.", color: "from-green-400 to-green-600"  },
  { icon: "🌱", title: "Impacto Social",     description: "Crecer está bien. Crecer impulsando el crecimiento de otros es mejor.",                                            color: "from-orange-400 to-orange-600"},
];

const flipCards = [
  {
    src: "/imgs/Naranja-Seleccion.webp",
    alt: "Campesino recogiendo naranjas al amanecer en Cundinamarca",
    icon: "🌅",
    title: "El origen lo es todo",
    body: "Madrugamos junto al campesino para elegir solo la fruta en su punto exacto de madurez. No hay atajos en el campo — y nosotros tampoco los tomamos.",
  },
  {
    src: "/imgs/Naranja-Compra.webp",
    alt: "Compra directa al productor — camión cargado de naranjas en finca colombiana",
    icon: "🤝",
    title: "Compramos en finca",
    body: "Sin intermediarios. El campesino colombiano merece un precio justo y vos merecés saber exactamente de dónde viene lo que tomás.",
  },
  {
    src: "/imgs/Naranja-Frio.webp",
    alt: "Proceso artesanal de exprimido en frío de naranja",
    icon: "🧊",
    title: "Frío por convicción",
    body: "Exprimimos en frío para que las vitaminas lleguen intactas a tu mesa. La temperatura no es un detalle técnico — es nuestro compromiso con tu salud.",
  },
  {
    src: "/imgs/Naranja-Tiene-Juez.webp",
    alt: "Control de calidad — cada naranja es inspeccionada a mano",
    icon: "🔍",
    title: "Cada fruta tiene un juez",
    body: "Antes de entrar a producción, cada fruta pasa por manos que saben lo que buscan. Si no cumple, no entra. Así de simple, así de honesto.",
  },
  {
    src: "/imgs/Naranja-Frescuras.webp",
    alt: "Frescura del jugo de naranja recién exprimido y embotellado",
    icon: "✨",
    title: "La frescura no espera",
    body: "De la naranja al frasco en minutos. Sin pasteurizar, sin conservantes — el jugo llega a vos con todo lo que la fruta tenía cuando salió del campo.",
  },
  {
    src: "/imgs/Naranja-Detras-Cada-Botella.webp",
    alt: "La pareja fundadora de Más Cerca AP trabajando en su planta",
    icon: "💚",
    title: "Detrás de cada botella",
    body: "Somos una pareja que apostó por lo natural cuando nadie lo pedía. Cada entrega lleva nuestro nombre — y eso nos obliga a dar siempre lo mejor.",
  },
];

function FlipCard({ card, index }: { card: typeof flipCards[0]; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const [hinted, setHinted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  // Peek automático: cuando la card entra al viewport hace un flip breve
  // para enseñarle al usuario que es interactiva — se ejecuta una sola vez
  useEffect(() => {
    if (!isInView || hinted) return;
    const peekDelay = setTimeout(() => {
      setFlipped(true);
      const returnDelay = setTimeout(() => {
        setFlipped(false);
        setHinted(true);
      }, 1100);
      return () => clearTimeout(returnDelay);
    }, 800 + index * 280);
    return () => clearTimeout(peekDelay);
  }, [isInView, hinted, index]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="relative h-48 md:h-64 [perspective:1000px] cursor-pointer group"
      onClick={() => setFlipped((f) => !f)}
      role="button"
      aria-label={`Ver descripción de: ${card.title}`}
    >
      {/* Inner — gira sobre el eje Y */}
      <div
        className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRENTE — imagen + título siempre visible */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl overflow-hidden shadow-lg">
          <Image
            src={card.src}
            alt={card.alt}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradiente inferior para legibilidad del título */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          {/* Título del proceso — siempre visible */}
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            <p className="text-white font-bold text-sm md:text-base leading-tight drop-shadow-md">
              {card.title}
            </p>
            <p className="text-white/70 text-[10px] md:text-xs mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Presioná para saber más
            </p>
          </div>
        </div>

        {/* DORSO — descripción del proceso */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center p-5 text-center gap-3">
          <span className="text-4xl">{card.icon}</span>
          <h3 className="text-white font-bold text-base md:text-lg leading-tight">
            {card.title}
          </h3>
          <p className="text-white/85 text-xs md:text-sm leading-relaxed">
            {card.body}
          </p>
          <span className="text-white/50 text-[10px] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Presioná para volver
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function NosotrosPageContent() {
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
                  src="/imgs/QuieneSomos.webp"
                  alt="Quiénes somos — Más Cerca AP"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Misión & Visión — Client Component con tab toggle */}
      <MisionVisionTabs />

      {/* Valores */}
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
                <div className={`h-1.5 w-full bg-gradient-to-r ${value.color}`} />
                <div className="p-8">
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

          {/* Instrucción mobile — solo visible en táctil */}
          <p className="md:hidden flex items-center justify-center gap-2 text-sm text-gray-500 italic mb-6">
            <span className="text-lg">👆</span>
            Presioná cada imagen para conocer el proceso
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {flipCards.map((card, index) => (
              <FlipCard key={index} card={card} index={index} />
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
