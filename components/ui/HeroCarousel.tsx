"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { m, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

type KenBurns = {
  initial: { scale: number; x: string };
  animate: { scale: number; x: string };
};

type SlideFrame = {
  image: string;
  kenBurns: KenBurns;
};

type SlideStructure = {
  id: number;
  ctaHref: string;
  ctaColor: string;
  duration: number;
  frames: SlideFrame[];
};

const FRAME_CROSSFADE_S = 0.8;
const RESUME_AFTER_INTERACTION_MS = 10_000;

const slides: SlideStructure[] = [
  {
    id: 1,
    ctaHref: "/nosotros",
    ctaColor: "bg-accent hover:bg-accent-dark",
    duration: 12000,
    frames: [
      {
        image: "/imgs/Slide1.1.webp",
        kenBurns: {
          initial: { scale: 1.0, x: "0%" },
          animate: { scale: 1.04, x: "0%" },
        },
      },
      {
        image: "/imgs/Slide1.2.webp",
        kenBurns: {
          initial: { scale: 1.02, x: "-2%" },
          animate: { scale: 1.02, x: "2%" },
        },
      },
      {
        image: "/imgs/Slide1.3.webp",
        kenBurns: {
          initial: { scale: 1.0, x: "0%" },
          animate: { scale: 1.04, x: "0%" },
        },
      },
      {
        image: "/imgs/pulpa-maracuya.webp",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.0, x: "0%" },
        },
      },
    ],
  },
  {
    id: 2,
    ctaHref: "/productos",
    ctaColor: "bg-primary hover:bg-primary-dark",
    duration: 9000,
    frames: [
      {
        image: "/imgs/Slide2.1.webp",
        kenBurns: {
          initial: { scale: 1.0, x: "0%" },
          animate: { scale: 1.04, x: "0%" },
        },
      },
      {
        image: "/imgs/Slide2.2.webp",
        kenBurns: {
          initial: { scale: 1.02, x: "-2%" },
          animate: { scale: 1.02, x: "2%" },
        },
      },
      {
        image: "/imgs/Slide2.3.webp",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.0, x: "0%" },
        },
      },
    ],
  },
  {
    id: 3,
    ctaHref: "/productos?categoria=pulpas",
    ctaColor: "bg-accent hover:bg-accent-dark",
    duration: 8000,
    frames: [
      {
        image: "/imgs/Slide3.1.webp",
        kenBurns: {
          initial: { scale: 1.02, x: "-2%" },
          animate: { scale: 1.02, x: "2%" },
        },
      },
      {
        image: "/imgs/Slide3.2.webp",
        kenBurns: {
          initial: { scale: 1.0, x: "0%" },
          animate: { scale: 1.04, x: "0%" },
        },
      },
    ],
  },
  {
    id: 4,
    ctaHref: "/nosotros",
    ctaColor: "bg-primary hover:bg-primary-dark",
    duration: 12000,
    frames: [
      {
        image: "/imgs/Slide4.1.webp",
        kenBurns: {
          initial: { scale: 1.0, x: "0%" },
          animate: { scale: 1.04, x: "0%" },
        },
      },
      {
        image: "/imgs/Slide4.2.webp",
        kenBurns: {
          initial: { scale: 1.02, x: "-2%" },
          animate: { scale: 1.02, x: "2%" },
        },
      },
      {
        image: "/imgs/Slide4.3.webp",
        kenBurns: {
          initial: { scale: 1.05, x: "0%" },
          animate: { scale: 1.0, x: "0%" },
        },
      },
    ],
  },
  {
    id: 5,
    ctaHref: "__whatsapp__",
    ctaColor: "bg-primary hover:bg-primary-dark",
    duration: 8000,
    frames: [
      {
        image: "/imgs/Slide5.1.webp",
        kenBurns: {
          initial: { scale: 1.02, x: "-2%" },
          animate: { scale: 1.02, x: "2%" },
        },
      },
      {
        image: "/imgs/Slide5.2.webp",
        kenBurns: {
          initial: { scale: 1.0, x: "0%" },
          animate: { scale: 1.04, x: "0%" },
        },
      },
    ],
  },
];

export default function HeroCarousel() {
  const { dict, lang } = useDictionary();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useInView(sectionRef, { amount: 0.1 });

  const slide = slides[currentSlide];
  const slideText = dict.home.hero.slides[currentSlide];
  const frameCount = slide.frames.length;
  const frameDurationMs = Math.floor(slide.duration / frameCount);
  const frame = slide.frames[Math.min(currentFrame, frameCount - 1)];

  const whatsappUrl = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(dict.whatsapp.message)}`;

  const resolveHref = (href: string) => {
    if (href === "__whatsapp__") return whatsappUrl;
    return `/${lang}${href}`;
  };

  useEffect(() => {
    setCurrentFrame(0);
  }, [currentSlide]);

  useEffect(() => {
    if (!isAutoPlaying || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, slide.duration);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isVisible, currentSlide, slide.duration]);

  useEffect(() => {
    if (frameCount <= 1 || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, frameDurationMs);
    return () => clearInterval(interval);
  }, [currentSlide, frameCount, frameDurationMs, isVisible]);

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
    <section ref={sectionRef} className="relative min-h-[500px] md:min-h-[600px] overflow-hidden">

      <AnimatePresence mode="wait">
        <m.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <AnimatePresence mode="sync">
            <m.div
              key={`${currentSlide}-${currentFrame}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FRAME_CROSSFADE_S, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <m.div
                initial={frame.kenBurns.initial}
                animate={frame.kenBurns.animate}
                transition={{ duration: frameDurationMs / 1000, ease: "linear" }}
                className="absolute inset-0"
              >
                <Image
                  src={frame.image}
                  alt={slideText.title.replace("\n", " ")}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={currentSlide === 0 && currentFrame === 0}
                />
              </m.div>
            </m.div>
          </AnimatePresence>

          <div className="hero-overlay absolute inset-0" />

          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white px-14 sm:px-8 md:px-4 max-w-3xl">

              <m.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block text-xs md:text-sm font-bold tracking-[0.25em] mb-3 text-cyan-200 uppercase bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full border border-cyan-300/50"
              >
                {slideText.subtitle}
              </m.p>

              <m.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 whitespace-pre-line leading-tight"
              >
                {slideText.title}
              </m.h1>

              <m.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-xs sm:text-base md:text-lg mb-6 md:mb-8 opacity-90 mt-1 sm:mt-0"
              >
                {slideText.description}
              </m.p>

              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link
                  href={resolveHref(slide.ctaHref)}
                  {...(slide.ctaHref === "__whatsapp__"
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={`inline-block ${slide.ctaColor} text-white font-bold py-3 px-8 rounded-full transition-all hover:scale-105`}
                >
                  {slideText.cta}
                </Link>
              </m.div>

            </div>
          </div>
        </m.div>
      </AnimatePresence>

      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 sm:p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
        aria-label={dict.home.hero.prevSlide}
      >
        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 sm:p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
        aria-label={dict.home.hero.nextSlide}
      >
        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

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
            aria-label={`${dict.home.hero.goToSlide} ${index + 1}`}
          />
        ))}
      </div>

    </section>
  );
}
