/**
 * Actualiza los beneficios de los Zumos en Supabase.
 * Fuente de verdad: imagen Beneficios.png + beneficio de facilidad de preparación.
 * Ejecutar: npx tsx scripts/update-zumos-benefits.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const EASE_OF_USE = "Fácil de preparar: solo agrega hielo y agua al gusto";

const zumoUpdates: Record<string, { benefits: string[] }> = {
  // Zumo de Limón — 4 presentaciones
  "limon-600":  { benefits: ["Sabor intenso e inconfundible", "Alto rendimiento por preparación", "Ideal para bebidas y coctelería", EASE_OF_USE] },
  "limon-1000": { benefits: ["Sabor intenso e inconfundible", "Alto rendimiento por preparación", "Ideal para bebidas y coctelería", EASE_OF_USE] },
  "limon-2000": { benefits: ["Sabor intenso e inconfundible", "Alto rendimiento por preparación", "Ideal para bebidas y coctelería", EASE_OF_USE] },
  "limon-5000": { benefits: ["Sabor intenso e inconfundible", "Alto rendimiento por preparación", "Ideal para bebidas y coctelería", EASE_OF_USE] },

  // Zumo de Limonada con Cereza — 3 presentaciones
  "cereza-350":  { benefits: ["Sabor único con toque de cereza", "Color vibrante para tus preparaciones", "Perfecto para coctelería y eventos", EASE_OF_USE] },
  "cereza-1000": { benefits: ["Sabor único con toque de cereza", "Color vibrante para tus preparaciones", "Perfecto para coctelería y eventos", EASE_OF_USE] },
  "cereza-2000": { benefits: ["Sabor único con toque de cereza", "Color vibrante para tus preparaciones", "Perfecto para coctelería y eventos", EASE_OF_USE] },

  // Zumo de Limonada con Coco — 3 presentaciones
  "coco-350":  { benefits: ["Combinación tropical con coco", "Sabor diferenciado para tus recetas", "Ideal para preparar bebidas refrescantes", EASE_OF_USE] },
  "coco-1000": { benefits: ["Combinación tropical con coco", "Sabor diferenciado para tus recetas", "Ideal para preparar bebidas refrescantes", EASE_OF_USE] },
  "coco-2000": { benefits: ["Combinación tropical con coco", "Sabor diferenciado para tus recetas", "Ideal para preparar bebidas refrescantes", EASE_OF_USE] },

  // Zumo de Maracuyá — 3 presentaciones
  "maracuya-350":  { benefits: ["Sabor exótico y aroma intenso", "Realza el sabor de tus preparaciones", "Favorito para coctelería y bebidas", EASE_OF_USE] },
  "maracuya-1000": { benefits: ["Sabor exótico y aroma intenso", "Realza el sabor de tus preparaciones", "Favorito para coctelería y bebidas", EASE_OF_USE] },
  "maracuya-2000": { benefits: ["Sabor exótico y aroma intenso", "Realza el sabor de tus preparaciones", "Favorito para coctelería y bebidas", EASE_OF_USE] },
};

async function main() {
  console.log(`Actualizando beneficios de ${Object.keys(zumoUpdates).length} productos...\n`);

  for (const [id, { benefits }] of Object.entries(zumoUpdates)) {
    const { error } = await supabase
      .from("products")
      .update({ benefits })
      .eq("id", id);

    if (error) {
      console.error(`  ✗ ${id}: ${error.message}`);
    } else {
      console.log(`  ✓ ${id}`);
    }
  }

  console.log("\nListo.");
}

main().catch(console.error);
