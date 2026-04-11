import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { GoogleAnalytics } from "@next/third-parties/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Mas Cerca Ap - Jugos 100% Naturales Bogotá",
  description: "Jugos y cítricos 100% naturales. Del campo al vaso en horas. Bogotá.",
  keywords: ["jugos", "naturales", "Bogotá", "limón", "naranja", "zumos", "bebidas"],
  openGraph: {
    title: "Mas Cerca Ap - Jugos 100% Naturales",
    description: "Jugos y cítricos 100% naturales. Del campo al vaso en horas.",
    type: "website",
    locale: "es_CO",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mas Cerca Ap",
  url: "https://mascercap.com",
  logo: "https://mascercap.com/logo.png",
  description: "Productores de jugos y cítricos 100% naturales en Bogotá, Colombia.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bogotá",
    addressCountry: "CO",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+57-300-123-4567",
    contactType: "customer service",
    availableLanguage: "Spanish",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${poppins.variable} font-poppins antialiased`}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
        </div>
      {/* Google Analytics 4 — solo se carga si NEXT_PUBLIC_GA_ID está configurado */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
      </body>
    </html>
  );
}