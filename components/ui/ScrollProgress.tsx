"use client";

import { useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

function getScrollProgress() {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  return total > 0 ? (scrolled / total) * 100 : 0;
}

function subscribeToScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}

export default function ScrollProgress() {
  const progress = useSyncExternalStore(
    subscribeToScroll,
    getScrollProgress,
    () => 0,   // SSR snapshot
  );
  const shouldReduce = usePrefersReducedMotion();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none">
      <div
        className="h-full bg-accent"
        style={{
          width: `${progress}%`,
          transition: shouldReduce ? "none" : "width 80ms linear",
        }}
      />
    </div>
  );
}
