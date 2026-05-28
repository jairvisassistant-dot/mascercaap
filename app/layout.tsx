import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { cookies, headers } from "next/headers";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: "Mas Cerca AP", template: "%s | Mas Cerca AP" },
  description: "Mas Cerca AP — pulpas de fruta, jugos y lácteos colombianos 100% naturales. Kumis, yogurt, limonadas y más, directo desde Chía, Cundinamarca.",
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  openGraph: {
    siteName: "Mas Cerca AP",
    locale: "es_CO",
    type: "website",
  },
};

// Applies saved theme before first paint to avoid flash of unstyled content.
// Reads the `theme` cookie directly from document.cookie (client-side only).
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?m[1]:(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [ckrs, hdrs] = await Promise.all([cookies(), headers()]);
  const cookieLang = ckrs.get("NEXT_LOCALE")?.value;
  const headerLang = hdrs.get("x-lang");
  const lang = cookieLang === "en" || headerLang === "en" ? "en" : "es";
  const nonce = hdrs.get("x-nonce") ?? undefined;

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <Script
          id="theme-detector"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /* safe: THEME_SCRIPT is a build-time constant string, not user input */
        />
        {children}
      </body>
    </html>
  );
}
