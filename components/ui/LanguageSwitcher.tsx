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
    const newPath = pathname.replace(`/${lang}`, `/${targetLang}`);
    document.cookie = `NEXT_LOCALE=${targetLang};path=/;max-age=31536000`;
    router.push(newPath);
  };

  return (
    <button
      onClick={switchLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-all"
      aria-label={lang === "es" ? dict.nav.switchToEnglish : dict.nav.switchToSpanish}
    >
      <span className="text-base">{lang === "es" ? "🇺🇸" : "🇨🇴"}</span>
      <span>{lang === "es" ? "EN" : "ES"}</span>
    </button>
  );
}
