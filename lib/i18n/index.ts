import "server-only";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export const hasLocale = (locale: string): locale is Locale =>
  locales.includes(locale as Locale);

const dictionaries = {
  es: () => import("@/messages/es.json").then((m) => m.default),
  en: () => import("@/messages/en.json").then((m) => m.default),
};

export const getDictionary = async (locale: Locale) => dictionaries[locale]();

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
