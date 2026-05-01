"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import HelpMenu from "./drawer-views/HelpMenu";
import FaqView from "./drawer-views/FaqView";
import LegalView from "./drawer-views/LegalView";
import ContactView from "./drawer-views/ContactView";
import { privacyPolicy, termsAndConditions } from "@/data/legal";
import type { Locale } from "@/lib/i18n";

type View = "menu" | "faq" | "privacy" | "terms" | "contact";

type Props = { onClose: () => void };

export default function HelpDrawer({ onClose }: Props) {
  const { dict, lang } = useDictionary();
  const locale = lang as Locale;
  const t = dict.helpHub;
  const [view, setView] = useState<View>("menu");
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function getTitle(): string {
    if (view === "menu") return t.title;
    if (view === "faq") return t.menu.faq;
    if (view === "privacy") return privacyPolicy.title[locale];
    if (view === "terms") return termsAndConditions.title[locale];
    return t.menu.contact;
  }

  return (
    <>
      {/* Overlay */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <m.div
        ref={drawerRef}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-surface-card shadow-2xl w-[90vw] sm:w-[45vw] max-w-[560px]"
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-soft shrink-0 bg-primary">
          {view !== "menu" && (
            <button
              onClick={() => setView("menu")}
              className="text-white/80 hover:text-white transition-colors shrink-0"
              aria-label={t.back}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg className="w-5 h-5 text-white/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            <h2 className="text-sm font-semibold text-white truncate">
              {getTitle()}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors shrink-0"
            aria-label={t.close}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={view}
              initial={{ opacity: 0, x: view === "menu" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {view === "menu" && (
                <HelpMenu onNavigate={setView} />
              )}
              {view === "faq" && (
                <FaqView onContactClick={() => setView("contact")} />
              )}
              {view === "privacy" && (
                <LegalView document={privacyPolicy} lang={locale} lastUpdatedLabel={dict.legal.lastUpdated} />
              )}
              {view === "terms" && (
                <LegalView document={termsAndConditions} lang={locale} lastUpdatedLabel={dict.legal.lastUpdated} />
              )}
              {view === "contact" && (
                <ContactView />
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </m.div>
    </>
  );
}
