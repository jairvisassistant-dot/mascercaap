// Tipos para el sitio web de Mas Cerca Ap

export type ProductLineKey =
  | "limon"
  | "limonada-cereza"
  | "limonada-coco"
  | "maracuya"
  | "pulpas"
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

// ContactFormData se infiere de Zod en app/contacto/page.tsx
// Fuente de verdad: z.infer<typeof contactSchema>
