"use client";

import { useReducedMotion } from "framer-motion";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { Testimonial } from "@/types";

interface TestimonialMarqueeProps {
  testimonials: Testimonial[];
  dict: Dictionary;
  lang: Locale;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? "text-accent" : "text-white/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, lang }: { testimonial: Testimonial; lang: Locale }) {
  const text =
    lang !== "es" && testimonial.text_en ? testimonial.text_en : testimonial.text;
  const role =
    lang !== "es" && testimonial.role_en ? testimonial.role_en : testimonial.role;

  return (
    <div className="w-[300px] shrink-0 mr-4 bg-white/[0.07] border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <StarRating rating={testimonial.rating} />
      <p className="text-white/82 text-sm leading-relaxed mb-4 line-clamp-3">{text}</p>
      <div className="flex items-center gap-2.5 pt-3 border-t border-white/10">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">
            {testimonial.name.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">{testimonial.name}</p>
          <p className="text-white/50 text-[10px] truncate">{role}</p>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({
  items,
  direction,
  lang,
}: {
  items: Testimonial[];
  direction: "left" | "right";
  lang: Locale;
}) {
  const doubled = [...items, ...items];

  return (
    <div className="group flex overflow-hidden">
      <div
        className={`flex shrink-0 will-change-transform ${
          direction === "left"
            ? "animate-marquee-left group-hover:[animation-play-state:paused]"
            : "animate-marquee-right group-hover:[animation-play-state:paused]"
        }`}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={`${direction}-${t.id}-${i}`} testimonial={t} lang={lang} />
        ))}
      </div>
    </div>
  );
}

export default function TestimonialMarquee({
  testimonials,
  dict,
  lang,
}: TestimonialMarqueeProps) {
  const shouldReduceMotion = useReducedMotion();

  if (testimonials.length === 0) return null;

  const row1 = testimonials.filter((_, i) => i % 2 === 0);
  const row2 = testimonials.filter((_, i) => i % 2 !== 0);

  if (shouldReduceMotion) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-label={dict.home.testimonials.label}
      >
        {testimonials.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} lang={lang} />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-label={dict.home.testimonials.label}
      className="flex flex-col gap-4 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <MarqueeRow items={row1} direction="left" lang={lang} />
      <MarqueeRow items={row2} direction="right" lang={lang} />
    </div>
  );
}
