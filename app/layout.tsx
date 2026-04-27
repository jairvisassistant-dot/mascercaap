import "./globals.css";

// Root layout minimal — no renderiza <html>/<body>.
// Cada segmento de ruta provee su propio <html lang={locale}> para que el atributo
// sea correcto en SSR: app/[lang]/layout.tsx y app/studio/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
