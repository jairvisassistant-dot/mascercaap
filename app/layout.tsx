import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    {/* lang="es" hardcodeado — limitación arquitectural de Next.js App Router.
        El layout raíz no tiene acceso al segmento [lang]. La versión /en/ hereda este valor.
        Fix definitivo: mover html/body a app/[lang]/layout.tsx (requiere reestructurar layouts). */}
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.variable} font-poppins antialiased`}>
        {children}
      </body>
    </html>
  );
}
