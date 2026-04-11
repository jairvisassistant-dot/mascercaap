"use client";

import { motion } from "framer-motion";
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

// Alts descriptivos para cada imagen de la galería de proceso (A11Y-02)
const galleryImages = [
  { src: "https://images.unsplash.com/photo-1587581152853-8e2c81d96d9f?w=600&q=80", alt: "Selección de frutas frescas del campo colombiano" },
  { src: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80", alt: "Limones maduros listos para exprimir" },
  { src: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80", alt: "Proceso artesanal de exprimido en frío" },
  { src: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80", alt: "Envasado en botellas limpias y selladas" },
  { src: "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80", alt: "Jugos naturales Más Cerca AP listos para entregar" },
  { src: "https://images.unsplash.com/photo-1595981234058-f93a7d97c2de?w=600&q=80", alt: "Distribución fresca en toda Bogotá" },
];

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
                  src="/imgs/QuieneSomos.png"
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-lg"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
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
