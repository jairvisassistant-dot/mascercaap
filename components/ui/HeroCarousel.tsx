"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const slides = [
  {
    id: 1,
    title: "Sabor natural, directo a tu mesa",
    subtitle: "100% NATURAL",
    description: "Siente la frescura en cada sorbo",
    cta: "Ver Productos",
    ctaHref: "/productos",
    ctaColor: "bg-accent hover:bg-accent-dark",
    image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=1200&q=80",
  },
  {
    id: 2,
    title: "Del campo al vaso en horas",
    subtitle: "PROCESO ARTESANAL",
    description: "Elaborados con frutas seleccionadas",
    cta: "Conocer más",
    ctaHref: "/nosotros",
    ctaColor: "bg-primary hover:bg-primary-dark",
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=1200&q=80",
  },
  {
    id: 3,
    title: "Ofertas frescas cada día",
    subtitle: "DESCUENTOS ESPECIALES",
    description: "Descubre nuestras promociones del día",
    cta: "Ver Ofertas",
    ctaHref: "/productos",
    ctaColor: "bg-accent hover:bg-accent-dark",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&q=80",
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // Cancela el timer anterior antes de crear uno nuevo — evita múltiples timers en vuelo
  const pauseAndResume = () => {
    setIsAutoPlaying(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsAutoPlaying(true), 10000);
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
    <section className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <Image
            src={slides[currentSlide].image}
            alt={slides[currentSlide].title}
            fill
            className="object-cover"
            priority={currentSlide === 0}
          />

          {/* Overlay */}
          <div className="hero-overlay absolute inset-0" />

          {/* Content */}
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white px-4 max-w-3xl">
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-4xl md:text-6xl font-bold mb-4"
              >
                {slides[currentSlide].title}
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-xl md:text-2xl mb-2 font-semibold"
              >
                {slides[currentSlide].subtitle}
              </motion.p>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-lg mb-8 opacity-90"
              >
                {slides[currentSlide].description}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link
                  href={slides[currentSlide].ctaHref}
                  className={`inline-block ${slides[currentSlide].ctaColor} text-white font-bold py-3 px-8 rounded-full transition-all hover:scale-105`}
                >
                  {slides[currentSlide].cta}
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Anterior"
      >
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Siguiente"
      >
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      {/* Dots Navigation */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? "bg-white w-6" : "bg-white/60 hover:bg-white/80"
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}