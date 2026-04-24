// Tipos para el sitio web de Mas Cerca Ap

// ── FAQ / Chatbot ──────────────────────────────────────────────────────────
export type FAQQuestion = {
  id: string;
  question: { es: string; en: string };
  answer: { es: string; en: string };
  keywords: string[];
};

export type FAQCategory = {
  id: string;
  label: { es: string; en: string };
  icon: string;
  questions: FAQQuestion[];
};

export type FAQData = {
  categories: FAQCategory[];
  fallback: { es: string; en: string };
};

// ── Product lines translation ──────────────────────────────────────────────
export type ProductLineTranslation = { label: string; description: string };

export type ProductLineKey =
  | "limon"
  | "limonada-cereza"
  | "limonada-coco"
  | "maracuya"
  | "pulpa-maracuya"
  | "pulpa-mora"
  | "pulpa-fresa"
  | "pulpa-mango"
  | "pulpa-guanabana"
  | "pulpa-lulo"
  | "pulpa-guayaba"
  | "pulpa-frutos-rojos"
  | "pulpa-tomate-arbol"
  | "kumiss";

export type Product = {
  id: string;
  name: string;
  line: ProductLineKey;
  presentation: string;      // "350ml", "600ml", "1L", "2L", "5L"
  presentationOrder: number; // para ordenar de menor a mayor
  price?: number;
  image: string;
  description: string;
  ingredients?: string[];
  benefits?: string[];
  // Campos de estado — gestionados desde Sanity Studio
  isSoldOut?: boolean;
  isBestSeller?: boolean;
  featured?: boolean;
};

export type ProductLineConfig = {
  key: ProductLineKey;
  label: string;
  description: string;
  gradient: string;   // clases Tailwind
  iconEmoji: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  text_en?: string;
  role_en?: string;
  rating: 1 | 2 | 3 | 4 | 5;
};


// ContactFormData: inferida desde Zod (fuente de verdad), re-exportada aquí para
// que types/index.ts siga siendo el punto de importación único del proyecto.
export type { ContactFormData } from "@/lib/schemas/contact";
