"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type KenBurns = {
  initial: { scale: number; x: string };
  animate: { scale: number; x: string };
};

type SlideFrame = {
  /** Ruta de la imagen. Reemplazar con las rutas reales en /imgs/hero/ */
  image: string;
  kenBurns: KenBurns;
};

type Slide = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  ctaHref: string;
  ctaColor: string;
  /** Duración total del slide en ms — se divide entre los frames */
  duration: number;
  frames: SlideFrame[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const FRAME_CROSSFADE_S = 0.8;
const RESUME_AFTER_INTERACTION_MS = 10_000;

const whatsappUrl = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent("Hola! Quiero hacer un pedido")}`;

// ─── Datos de slides ──────────────────────────────────────────────────────────
//
// Estructura de imágenes esperada:
//   /public/imgs/hero/
//     slide1-campo.jpg      ← Frame 1: campo colombiano, manos campesino, maracuyá
//     slide1-producto.jpg   ← Frame 2: mesa rústica, fruta + botella con condensación
//     slide2-restaurante.jpg
//     slide2-vaso.jpg
//     slide3-cocina.jpg
//     slide3-pulpa.jpg
//     slide4-macro.jpg
//     slide4-backlit.jpg
//     slide5-bodega.jpg
//     slide5-entrega.jpg
//
// Placeholders: se usan imágenes de Unsplash hasta que lleguen las definitivas.

const slides: Slide[] = [
  {
    id: 1,
    title: "La fruta sale del campo hoy.\nMañana está en tu mesa.",
    subtitle: "PULPAS 100% NATURALES · SIN CONSERVANTES · SIN COLORANTES",
    description: "Fruta colombiana congelada en su punto exacto de madurez. Conserva sus aromas, color y sabor — exactamente como recién cosechada.",
    cta: "Conocer nuestra historia",
    ctaHref: "/nosotros",
    ctaColor: "bg-accent hover:bg-accent-dark",
    duration: 12000,
    frames: [
      {
        // Acto 1 — El campo: manos campesino sosteniendo maracuyá, golden hour
        image: "/imgs/Slide1.1.webp",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.18, x: "0%" },
        },
      },
      {
        // Acto 2 — La producción: operarias despulpando fruta en maquinaria industrial
        image: "/imgs/Slide1.2.png",
        kenBurns: {
          initial: { scale: 1.1, x: "-4%" },
          animate: { scale: 1.1, x: "4%" },
        },
      },
      {
        // Acto 3 — La cadena de frío: operario en cámara frigorífica, sin conservantes
        image: "/imgs/Slide1.3.png",
        kenBurns: {
          initial: { scale: 1.08, x: "0%" },
          animate: { scale: 1.18, x: "0%" },
        },
      },
      {
        // Acto 4 — El producto final: pulpa lista para tu mesa
        image: "/imgs/pulpa-maracuya.webp",
        kenBurns: {
          initial: { scale: 1.2, x: "0%" },
          animate: { scale: 1.05, x: "0%" },
        },
      },
    ],
  },
  {
    id: 2,
    title: "La calidad de nuestros productos\nno se compara.",
    subtitle: "FÁCIL DE PREPARAR, LISTO AL INSTANTE",
    description: "Elaborados con los más altos estándares de calidad para que disfrutes del sabor auténtico de la fruta que te gusta en cada sorbo.",
    cta: "Ver zumos",
    ctaHref: "/productos",
    ctaColor: "bg-primary hover:bg-primary-dark",
    duration: 9000,
    frames: [
      {
        // Acto 1 — El producto: botella de concentrado, condensación, cocina cálida
        image: "/imgs/Slide2.1.png",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.18, x: "0%" },
        },
      },
      {
        // Acto 2 — La preparación: concentrado vertiéndose en jarra con agua, remolino de color
        image: "/imgs/Slide2.2.png",
        kenBurns: {
          initial: { scale: 1.1, x: "-4%" },
          animate: { scale: 1.1, x: "4%" },
        },
      },
      {
        // Acto 3 — El disfrute: jarra y vasos servidos en restaurante, bokeh cálido
        image: "/imgs/Slide2.3.png",
        kenBurns: {
          initial: { scale: 1.2, x: "0%" },
          animate: { scale: 1.05, x: "0%" },
        },
      },
    ],
  },
  {
    id: 3,
    title: "Ahorrá 3 horas en cocina.\nSin sacrificar sabor.",
    subtitle: "PULPAS PREPROCESADAS",
    description: "Nuestras pulpas llegan listas. Vos solo servís.",
    cta: "Ver pulpas",
    ctaHref: "/productos",
    ctaColor: "bg-accent hover:bg-accent-dark",
    duration: 8000,
    frames: [
      {
        // Cocina comercial: manos cocinero procesando fruta manualmente, tabla de cortar
        image: "/imgs/Slide3.1.webp",
        kenBurns: {
          initial: { scale: 1.12, x: "-5%" },
          animate: { scale: 1.12, x: "5%" },
        },
      },
      {
        // Mismas manos sosteniendo pulpa lista — vaso servido desenfocado al fondo
        image: "/imgs/Slide3.2.webp",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.18, x: "0%" },
        },
      },
    ],
  },
  {
    id: 4,
    title: "Servimos con amor, honestidad\ny fe en cada entrega.",
    subtitle: "MÁS CERCA AP — TU ALIADO COMERCIAL",
    description: "Más que distribuidores, somos el puente que acerca los mejores productos colombianos a tu negocio.",
    cta: "Conocer nuestra historia",
    ctaHref: "/nosotros",
    ctaColor: "bg-primary hover:bg-primary-dark",
    duration: 12000,
    frames: [
      {
        // Acto 1 — El origen: agricultor colombiano con poncho y sombrero, sacos de fruta, montañas al fondo
        image: "/imgs/Slide4.1.png",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.18, x: "0%" },
        },
      },
      {
        // Acto 2 — El acuerdo: representante Más Cerca AP da la mano al campesino proveedor en el campo
        image: "/imgs/Slide4.2.png",
        kenBurns: {
          initial: { scale: 1.1, x: "-4%" },
          animate: { scale: 1.1, x: "4%" },
        },
      },
      {
        // Acto 3 — La entrega: representante cierra trato con cliente en bodega, productos en mesa
        image: "/imgs/Slide4.3.png",
        kenBurns: {
          initial: { scale: 1.2, x: "0%" },
          animate: { scale: 1.05, x: "0%" },
        },
      },
    ],
  },
  {
    id: 5,
    title: "Pedís hoy.\nLo tenés mañana en tu negocio.",
    subtitle: "ENTREGA EN BOGOTÁ",
    description: "Desde Puente Aranda a toda la ciudad en menos de 24 horas.",
    cta: "Hacer pedido ahora",
    ctaHref: whatsappUrl,
    ctaColor: "bg-primary hover:bg-primary-dark",
    duration: 8000,
    frames: [
      {
        // Bodega Mas Cerca AP — persona preparando pedido, luz de mañana
        image: "/imgs/Slide5.1.webp",
        kenBurns: {
          initial: { scale: 1.12, x: "-5%" },
          animate: { scale: 1.12, x: "5%" },
        },
      },
      {
        // Caja de productos en umbral de puerta de negocio — mano recibiendo al fondo
        image: "/imgs/Slide5.2.webp",
        kenBurns: {
          initial: { scale: 1.08, x: "0%" },
          animate: { scale: 1.18, x: "0%" },
        },
      },
    ],
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useInView(sectionRef, { amount: 0.1 });

  const slide = slides[currentSlide];
  const frameCount = slide.frames.length;
  const frameDurationMs = Math.floor(slide.duration / frameCount);
  const frame = slide.frames[Math.min(currentFrame, frameCount - 1)];

  // Resetea el frame interno cuando cambia el slide externo
  useEffect(() => {
    setCurrentFrame(0);
  }, [currentSlide]);

  // Autoplay del carrusel externo (entre slides) — pausa cuando no es visible (PERF-04)
  useEffect(() => {
    if (!isAutoPlaying || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, slide.duration);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isVisible, currentSlide, slide.duration]);

  // Ciclo interno de frames dentro de cada slide — pausa cuando no es visible (PERF-04)
  useEffect(() => {
    if (frameCount <= 1 || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, frameDurationMs);
    return () => clearInterval(interval);
  }, [currentSlide, frameCount, frameDurationMs, isVisible]);

  // Limpieza del timer de reanudación al desmontar
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const pauseAndResume = () => {
    setIsAutoPlaying(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(
      () => setIsAutoPlaying(true),
      RESUME_AFTER_INTERACTION_MS
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    pauseAndResume();
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    pauseAndResume();
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    pauseAndResume();
  };

  return (
    <section ref={sectionRef} className="relative h-[500px] md:h-[600px] overflow-hidden">

      {/* ── Transición externa entre slides ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* ── Crossfade interno entre frames ─────────────────────────────── */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`${currentSlide}-${currentFrame}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FRAME_CROSSFADE_S, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              {/* ── Ken Burns ──────────────────────────────────────────────── */}
              <motion.div
                initial={frame.kenBurns.initial}
                animate={frame.kenBurns.animate}
                transition={{ duration: frameDurationMs / 1000, ease: "linear" }}
                className="absolute inset-0"
              >
                <Image
                  src={frame.image}
                  alt={slide.title.replace("\n", " ")}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={currentSlide === 0 && currentFrame === 0}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* ── Overlay ─────────────────────────────────────────────────────── */}
          <div className="hero-overlay absolute inset-0" />

          {/* ── Contenido de texto ──────────────────────────────────────────── */}
          {/* El texto NO reanima en el crossfade de frames — solo al cambiar el slide */}
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white px-4 max-w-3xl">

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block text-xs md:text-sm font-bold tracking-[0.25em] mb-3 text-cyan-200 uppercase bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-cyan-300/50"
              >
                {slide.subtitle}
              </motion.p>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 whitespace-pre-line leading-tight"
              >
                {slide.title}
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm sm:text-base md:text-lg mb-6 md:mb-8 opacity-90"
              >
                {slide.description}
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link
                  href={slide.ctaHref}
                  className={`inline-block ${slide.ctaColor} text-white font-bold py-3 px-8 rounded-full transition-all hover:scale-105`}
                >
                  {slide.cta}
                </Link>
              </motion.div>

            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Flechas de navegación ────────────────────────────────────────────── */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
        aria-label="Slide anterior"
      >
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
        aria-label="Slide siguiente"
      >
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── Dots de navegación ───────────────────────────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => goToSlide(index)}
            className={`h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-white w-6"
                : "bg-white/60 hover:bg-white/80 w-3"
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>

    </section>
  );
}
