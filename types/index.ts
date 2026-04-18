// Tipos para el sitio web de Mas Cerca Ap

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
  rating: 1 | 2 | 3 | 4 | 5;
};

export type SalesPoint = {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  schedule: string;
  phone: string;
};

// ContactFormData: inferida desde Zod (fuente de verdad), re-exportada aquí para
// que types/index.ts siga siendo el punto de importación único del proyecto.
export type { ContactFormData } from "@/lib/schemas/contact";
