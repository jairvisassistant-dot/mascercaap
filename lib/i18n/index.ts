import "server-only";
import { cache } from "react";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const hasLocale = (locale: string): locale is Locale =>
  locales.includes(locale as Locale);

const dictionaries = {
  es: () => import("@/messages/es.json").then((m) => m.default),
  en: () => import("@/messages/en.json").then((m) => m.default),
};

// React.cache() deduplicates calls dentro del mismo request:
// layout, generateMetadata y el componente de página comparten el mismo resultado
// sin cargar el JSON más de una vez por request.
export const getDictionary = cache(async (locale: Locale) => dictionaries[locale]());

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
