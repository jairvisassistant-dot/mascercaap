"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence, useInView } from "framer-motion";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Testimonial } from "@/types";

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  dict: Dictionary;
  lang: Locale;
}

export default function TestimonialCarousel({ testimonials, dict, lang }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useInView(sectionRef, { amount: 0.1 });

  // Pausa el autoplay cuando el carrusel no está en el viewport (PERF-04)
  useEffect(() => {
    if (testimonials.length === 0 || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [testimonials.length, isVisible]);

  if (testimonials.length === 0) return null;

  return (
    <div ref={sectionRef} className="relative max-w-3xl mx-auto px-4">
      <AnimatePresence mode="wait">
        <m.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-8 md:p-10 text-center"
        >
          {/* Comilla decorativa */}
          <div className="text-6xl text-white/20 font-serif leading-none mb-2 select-none">&ldquo;</div>

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
          <p className="text-white/90 text-lg md:text-xl mb-6 italic leading-relaxed">
            {(lang !== "es" && testimonials[currentIndex].text_en) || testimonials[currentIndex].text}
          </p>

          {/* Divider */}
          <div className="w-10 h-px bg-accent/60 mx-auto mb-5" />

          {/* Author */}
          <div>
            <p className="font-bold text-white text-base">
              {testimonials[currentIndex].name}
            </p>
            <p className="text-white/50 text-sm mt-0.5">
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
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? "bg-accent w-6" : "bg-white/25 hover:bg-white/40 w-2"
            }`}
            aria-label={`${dict.home.testimonials.goTo} ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}