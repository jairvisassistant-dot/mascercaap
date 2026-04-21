"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

const HelpDrawer = dynamic(() => import("./HelpDrawer"), { ssr: false });

export default function HelpHub() {
  const [isOpen, setIsOpen] = useState(false);
  const { dict } = useDictionary();
  const t = dict.helpHub;

  return (
    <>
      <m.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4, ease: "easeOut" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(true)}
        aria-label={t.trigger}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-primary text-white pl-3 pr-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        {/* Headphones icon */}
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
        <span className="text-sm font-semibold whitespace-nowrap">{t.trigger}</span>
      </m.button>

      <AnimatePresence>
        {isOpen && <HelpDrawer onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
