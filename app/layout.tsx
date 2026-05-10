import "./globals.css";
import { headers } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const headerLang = hdrs.get("x-lang");
  const lang = headerLang === "en" ? "en" : "es";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
