"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Testimonial } from "@/types";

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  dict: Dictionary;
  lang: Locale;
}

export default function TestimonialCarousel({ testimonials, dict, lang }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useInView(sectionRef, { amount: 0.1 });
  const shouldReduceMotion = useReducedMotion();

  // Pausa el autoplay cuando el carrusel no está en el viewport (PERF-04)
  useEffect(() => {
    if (testimonials.length === 0 || !isVisible || isPaused || shouldReduceMotion) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [testimonials.length, isVisible, isPaused, shouldReduceMotion]);

  if (testimonials.length === 0) return null;

  return (
    <div ref={sectionRef} className="relative max-w-3xl mx-auto px-4">
      <AnimatePresence mode="wait">
        <m.div
          key={currentIndex}
          initial={shouldReduceMotion ? false : { opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          className="bg-white/[0.07] backdrop-blur-sm border border-white/13 rounded-2xl p-8 md:p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          {/* Comilla decorativa */}
          <div className="text-6xl text-white/16 font-serif leading-none mb-2 select-none">&ldquo;</div>

          {/* Stars */}
          <div className="flex justify-center gap-1 mb-5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-5 h-5 ${i < testimonials[currentIndex].rating ? "text-accent" : "text-white/20"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Quote */}
          <p className="text-white/86 text-lg md:text-xl mb-6 italic leading-relaxed">
            {(lang !== "es" && testimonials[currentIndex].text_en) || testimonials[currentIndex].text}
          </p>

          {/* Divider */}
          <div className="w-10 h-px bg-accent/60 mx-auto mb-5" />

          {/* Author */}
          <div>
            <p className="font-bold text-white text-base">
              {testimonials[currentIndex].name}
            </p>
            <p className="text-white/56 text-sm mt-0.5">
              {(lang !== "es" && testimonials[currentIndex].role_en) || testimonials[currentIndex].role}
            </p>
          </div>
        </m.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              setIsPaused(true);
            }}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? "bg-accent/90 w-6" : "bg-white/22 hover:bg-white/34 w-2"
            }`}
            aria-label={`${dict.home.testimonials.goTo} ${index + 1}`}
          />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => setIsPaused((paused) => !paused)}
          className="rounded-full border border-white/12 bg-white/[0.075] px-4 py-2 text-sm font-medium text-white/72 transition-colors hover:border-white/24 hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#233746]"
          aria-pressed={isPaused}
        >
          {isPaused ? dict.home.testimonials.resume : dict.home.testimonials.pause}
        </button>
      </div>
    </div>
  );
}
