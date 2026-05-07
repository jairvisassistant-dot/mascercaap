"use client";

import { useRef, useState } from "react";
import { m, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from "framer-motion";

interface StickyStackItemProps {
  children: React.ReactNode;
  index: number;
  total: number;
}

export function StickyStackItem({ children, index, total }: StickyStackItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [hasLocked, setHasLocked] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const targetScale = 1 - (total - 1 - index) * 0.04;
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, shouldReduceMotion ? 1 : targetScale]
  );

  // Overlay oscuro que aparece a medida que la card queda enterrada
  const overlayOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.85],
    shouldReduceMotion ? [0, 0, 0] : [0, 0, 0.28]
  );

  // Detecta el momento exacto en que la card se "fija" y dispara el lock flash
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.018 && !hasLocked) {
      setHasLocked(true);
    }
  });

  return (
    <div
      ref={ref}
      className="sticky"
      style={{
        top: index * 24 + 72,
        zIndex: 10 + index,
      }}
    >
      <m.div
        style={{ scale, transformOrigin: "top center" }}
        className="will-change-transform relative"
      >
        {/* Lock flash: trazo de luz que barre el borde superior cuando la card se fija */}
        <m.div
          className="absolute inset-x-0 top-0 h-[2px] pointer-events-none z-20"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={
            hasLocked && !shouldReduceMotion
              ? {
                  opacity: [0, 1, 0],
                  scaleX: [0, 1, 1],
                  transition: {
                    duration: 0.65,
                    ease: "easeOut",
                    times: [0, 0.28, 1],
                  },
                }
              : {}
          }
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(63,143,70,0.9) 25%, rgba(229,138,34,0.75) 50%, rgba(63,143,70,0.9) 75%, transparent 100%)",
            transformOrigin: "center",
          }}
        />

        {/* Burial scrim: sombra que se intensifica mientras la siguiente card la solapa */}
        <m.div
          className="absolute inset-0 rounded-t-[32px] pointer-events-none z-10"
          style={{
            opacity: overlayOpacity,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)",
          }}
        />

        <div className="rounded-t-[32px] overflow-hidden shadow-[0_-6px_28px_rgba(0,0,0,0.09)]">
          {children}
        </div>
      </m.div>
    </div>
  );
}

export function StickyStackContainer({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}
