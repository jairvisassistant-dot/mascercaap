import type { Metadata } from "next";
import ContactoPageContent from "@/components/sections/ContactoPageContent";

export const metadata: Metadata = {
  title: "Contacto — Mas Cerca Ap",
  description:
    "Contactá a Más Cerca AP para hacer un pedido, ser distribuidor o hacer una consulta. Atendemos en Bogotá y enviamos a toda Colombia.",
  keywords: ["contacto", "pedidos", "distribuidor", "jugos naturales", "Bogotá", "WhatsApp"],
  openGraph: {
    title: "Contacto — Mas Cerca Ap",
    description:
      "Hacé tu pedido o consultá por distribución. Respondemos rápido por WhatsApp.",
    type: "website",
    locale: "es_CO",
  },
};

export default function ContactoPage() {
  return <ContactoPageContent />;
}
