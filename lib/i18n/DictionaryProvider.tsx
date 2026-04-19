"use client";

import { createContext, useContext } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import type { Dictionary } from "./index";
import type { Locale } from "./index";

type I18nContextValue = {
  dict: Dictionary;
  lang: Locale;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function DictionaryProvider({
  dict,
  lang,
  children,
}: {
  dict: Dictionary;
  lang: Locale;
  children: React.ReactNode;
}) {
  return (
    <LazyMotion features={domAnimation} strict>
      <I18nContext.Provider value={{ dict, lang }}>
        {children}
      </I18nContext.Provider>
    </LazyMotion>
  );
}

export function useDictionary(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return ctx;
}
