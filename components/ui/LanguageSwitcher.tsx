"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  dict: Dictionary;
  lang: Locale;
}

export default function LanguageSwitcher({ dict, lang }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = () => {
    const targetLang = lang === "es" ? "en" : "es";
    const rest = pathname.startsWith(`/${lang}`) ? pathname.slice(`/${lang}`.length) : "";
    const newPath = `/${targetLang}${rest}`;
    try { document.cookie = `NEXT_LOCALE=${targetLang};path=/;max-age=31536000`; } catch {}
    router.push(newPath);
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-mid text-sm font-medium text-text-muted hover:border-primary hover:text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
      aria-label={lang === "es" ? dict.nav.switchToEnglish : dict.nav.switchToSpanish}
    >
      <span className="text-base">{lang === "es" ? "🇺🇸" : "🇨🇴"}</span>
      <span>{lang === "es" ? "EN" : "ES"}</span>
    </button>
  );
}
