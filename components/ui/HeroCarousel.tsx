"use client";

import { useReducer, useState, useEffect, useRef } from "react";
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

type CarouselState = {
  currentSlide: number;
  currentFrame: number;
};

type CarouselAction =
  | { type: "setSlide"; index: number }
  | { type: "nextSlide" }
  | { type: "prevSlide" }
  | { type: "nextFrame"; frameCount: number };

function carouselReducer(state: CarouselState, action: CarouselAction): CarouselState {
  switch (action.type) {
    case "setSlide":
      return { currentSlide: action.index, currentFrame: 0 };
    case "nextSlide":
      return { currentSlide: (state.currentSlide + 1) % slides.length, currentFrame: 0 };
    case "prevSlide":
      return { currentSlide: (state.currentSlide - 1 + slides.length) % slides.length, currentFrame: 0 };
    case "nextFrame":
      return { ...state, currentFrame: (state.currentFrame + 1) % action.frameCount };
  }
}

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
        image: "/imgs/pulpaPortada-maracuya.webp",
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
  const [{ currentSlide, currentFrame }, dispatch] = useReducer(carouselReducer, {
    currentSlide: 0,
    currentFrame: 0,
  });
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
    if (!isAutoPlaying || !isVisible) return;
    const interval = setInterval(() => {
      dispatch({ type: "nextSlide" });
    }, slide.duration);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isVisible, currentSlide, slide.duration]);

  useEffect(() => {
    if (frameCount <= 1 || !isVisible) return;
    const interval = setInterval(() => {
      dispatch({ type: "nextFrame", frameCount });
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
    dispatch({ type: "setSlide", index });
    pauseAndResume();
  };

  const nextSlide = () => {
    dispatch({ type: "nextSlide" });
    pauseAndResume();
  };

  const prevSlide = () => {
    dispatch({ type: "prevSlide" });
    pauseAndResume();
  };

  return (
    <section ref={sectionRef} className="relative min-h-[540px] md:min-h-[640px] overflow-hidden bg-emerald-950">

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
                  loading={currentSlide === 0 && currentFrame > 0 ? "eager" : undefined}
                />
              </m.div>
            </m.div>
          </AnimatePresence>

          <div className="hero-overlay absolute inset-0" />

          <div className="relative h-full min-h-[540px] md:min-h-[640px]">
            <div className="mx-auto grid h-full min-h-[540px] max-w-7xl items-center px-6 py-28 sm:px-8 md:min-h-[640px] md:grid-cols-[minmax(0,0.92fr)_minmax(260px,0.58fr)] md:px-12 lg:px-16">
              <div className="max-w-2xl text-left text-white">

              <m.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-5 inline-flex max-w-full items-center rounded-none border-l-2 border-accent bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm md:text-xs"
              >
                {slideText.subtitle}
              </m.p>

              <m.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mb-5 max-w-[13ch] whitespace-pre-line text-balance text-4xl font-bold leading-[0.96] tracking-[-0.045em] drop-shadow-[0_10px_30px_rgba(0,0,0,0.38)] sm:text-5xl md:text-6xl lg:text-7xl"
              >
                {slideText.title}
              </m.h1>

              <m.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mb-8 max-w-[58ch] text-pretty text-sm leading-relaxed text-white/82 drop-shadow-[0_8px_22px_rgba(0,0,0,0.35)] sm:text-base md:text-lg"
              >
                {slideText.description}
              </m.p>

              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex flex-col items-start gap-4 sm:flex-row sm:items-center"
              >
                <Link
                  href={resolveHref(slide.ctaHref)}
                  {...(slide.ctaHref === "__whatsapp__"
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={`inline-flex min-h-12 items-center justify-center rounded-full ${slide.ctaColor} px-7 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] md:text-base`}
                >
                  {slideText.cta}
                </Link>
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/28 bg-white/10 px-7 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18 active:translate-y-0 active:scale-[0.98] md:text-base"
                >
                  {dict.nav.cta}
                </Link>
              </m.div>

              </div>

              <m.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, duration: 0.55 }}
                className="pointer-events-none mt-10 hidden self-end justify-self-end md:block"
              >
                <div className="max-w-[310px] border border-white/16 bg-emerald-950/34 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px w-10 bg-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/58">
                      Más Cerca AP
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-white/86">
                    {lang === "es"
                      ? "Del campo colombiano a tu mesa con frescura, cuidado y entrega cercana."
                      : "From Colombian farms to your table with freshness, care and close delivery."}
                  </p>
                </div>
              </m.div>

            </div>
          </div>
        </m.div>
      </AnimatePresence>

      <button
        onClick={prevSlide}
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-emerald-950/28 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white hover:text-primary hover:scale-105 active:scale-95 sm:left-5 sm:p-3"
        aria-label={dict.home.hero.prevSlide}
      >
        <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-emerald-950/28 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white hover:text-primary hover:scale-105 active:scale-95 sm:right-5 sm:p-3"
        aria-label={dict.home.hero.nextSlide}
      >
        <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="absolute bottom-7 left-6 z-10 flex gap-2.5 sm:left-8 md:left-12 lg:left-[calc((100vw-80rem)/2+4rem)]">
        {slides.map((s, index) => (
          <button
            key={s.id}
            onClick={() => goToSlide(index)}
            className={`h-2.5 rounded-full border border-white/20 transition-all duration-300 ${
              index === currentSlide
                ? "bg-white w-8"
                : "bg-white/35 hover:bg-white/70 w-2.5"
            }`}
            aria-label={`${dict.home.hero.goToSlide} ${index + 1}`}
          />
        ))}
      </div>

    </section>
  );
}
