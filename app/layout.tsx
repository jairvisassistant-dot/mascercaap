import "./globals.css";
import { headers } from "next/headers";

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme'),d=window.matchMedia('(prefers-color-scheme: dark)').matches,s=t==='light'||t==='dark'?t:d?'dark':'light';document.documentElement.setAttribute('data-theme',s);document.documentElement.style.colorScheme=s;}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const headerLang = hdrs.get("x-lang");
  const lang = headerLang === "en" ? "en" : "es";

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Theme init before first paint to prevent FOUC — placed in <head> to avoid React 19 script warning */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
