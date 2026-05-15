"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  dict: Dictionary;
  lang: Locale;
}

export default function LanguageSwitcher({ dict, lang }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = () => {
    const targetLang = lang === "es" ? "en" : "es";
    const rest = pathname.startsWith(`/${lang}`) ? pathname.slice(`/${lang}`.length) : "";
    const newPath = `/${targetLang}${rest}`;
    try { document.cookie = `NEXT_LOCALE=${targetLang};path=/;max-age=31536000`; } catch {}
    startTransition(() => { router.push(newPath); });
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={isPending}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
        isPending
          ? "border-primary/40 text-primary opacity-70 cursor-wait"
          : "border-border-mid text-text-muted hover:border-primary hover:text-primary"
      }`}
      aria-label={lang === "es" ? dict.nav.switchToEnglish : dict.nav.switchToSpanish}
    >
      {isPending ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <span className="text-base" aria-hidden="true">{lang === "es" ? "🇺🇸" : "🇨🇴"}</span>
      )}
      <span>{lang === "es" ? "EN" : "ES"}</span>
    </button>
  );
}
