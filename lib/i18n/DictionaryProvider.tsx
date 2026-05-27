"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./index";
import type { Locale } from "./index";

type I18nContextValue = {
  dict: Dictionary;
  lang: Locale;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * DictionaryProvider — distributes the i18n dictionary via React Context.
 *
 * EXISTE POR RAZONES HISTÓRICAS: componentes que YA eran Client Components
 * por interactividad real (estado, eventos, browser APIs) usan `useDictionary()`
 * para acceder al diccionario sin recibirlo como prop.
 *
 * IMPORTANT — Architectural constraint:
 * This provider exists ONLY for components that are ALREADY Client Components
 * due to real interactivity (state, events, browser APIs).
 *
 * For NEW components that only need `dict` for rendering:
 * do NOT use `useDictionary()`. Instead, receive `dict` as a prop from the
 * Server Component parent and call `getDictionary(lang)` there.
 *
 * See LECCIONES_APRENDIDAS.md — CAUSA RAÍZ #15 for the full rationale.
 */
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
    <I18nContext.Provider value={{ dict, lang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useDictionary(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return ctx;
}
