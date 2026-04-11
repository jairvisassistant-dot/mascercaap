import type { Metadata } from "next";
import NosotrosPageContent from "@/components/sections/NosotrosPageContent";

export const metadata: Metadata = {
  title: "Nosotros — Mas Cerca Ap",
  description:
    "Conocé la historia de Más Cerca AP: una empresa colombiana que produce y comercializa jugos, pulpas y productos frescos comprando directamente al campesino.",
  keywords: ["quiénes somos", "historia", "misión", "visión", "jugos naturales", "Colombia", "campo colombiano"],
  openGraph: {
    title: "Nosotros — Mas Cerca Ap",
    description:
      "Del campo colombiano a tu mesa. Conocé nuestra historia, misión y valores.",
    type: "website",
    locale: "es_CO",
  },
};

export default function NosotrosPage() {
  return <NosotrosPageContent />;
}
