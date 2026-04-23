import { Poppins, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="es" fijo por limitación de Next.js App Router — documentado en LECCIONES_APRENDIDAS.md
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.variable} ${dmSerif.variable} font-poppins antialiased`}>
        {children}
      </body>
    </html>
  );
}
