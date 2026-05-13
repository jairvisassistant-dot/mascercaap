import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: { default: "Más Cerca AP", template: "%s | Más Cerca AP" },
  description: "Productores de jugos y cítricos 100% naturales en Colombia.",
  metadataBase: new URL("https://mascercap.com"),
};

// Applies saved theme before first paint to avoid flash of unstyled content.
// Reads the `theme` cookie directly from document.cookie (client-side only).
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?m[1]:(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const lang = hdrs.get("x-lang") === "en" ? "en" : "es";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <Script
          id="theme-detector"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
