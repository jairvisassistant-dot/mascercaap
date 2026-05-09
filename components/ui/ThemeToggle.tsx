"use client";

import { useSyncExternalStore } from "react";

interface ThemeToggleProps {
  labels: {
    dark: string;
    light: string;
    activateDark: string;
    activateLight: string;
  };
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot() {
  return (document.documentElement.getAttribute("data-theme") ?? "light") as "light" | "dark";
}

function getThemeServerSnapshot(): "light" {
  return "light";
}

export default function ThemeToggle({ labels }: ThemeToggleProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem("theme", next); } catch {}
  };

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? labels.activateLight : labels.activateDark}
      title={isDark ? labels.light : labels.dark}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 hover:scale-105 ${
        isDark
          ? "bg-amber-400/15 border-amber-400/40 text-amber-400 hover:bg-amber-400/25"
          : "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
      }`}
    >
      {isDark ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{labels.light}</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span>{labels.dark}</span>
        </>
      )}
    </button>
  );
}
