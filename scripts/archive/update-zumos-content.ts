/**
 * Updates Zumo product ingredients and benefits in Supabase.
 * Removes natural/no-preservative claims from juice products.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const zumoUpdates: Record<string, { ingredients: string[]; benefits: string[] }> = {
  // Zumo de Limón — 4 presentaciones
  "limon-600":  { ingredients: ["Limón", "Agua purificada"], benefits: ["Refrescante al instante", "Listo para servir", "Disponible en 4 tamaños"] },
  "limon-1000": { ingredients: ["Limón", "Agua purificada"], benefits: ["Refrescante al instante", "Listo para servir", "Disponible en 4 tamaños"] },
  "limon-2000": { ingredients: ["Limón", "Agua purificada"], benefits: ["Refrescante al instante", "Listo para servir", "Disponible en 4 tamaños"] },
  "limon-5000": { ingredients: ["Limón", "Agua purificada"], benefits: ["Refrescante al instante", "Listo para servir", "Disponible en 4 tamaños"] },

  // Zumo de Limonada con Cereza — 3 presentaciones
  "cereza-350":  { ingredients: ["Limón", "Cereza", "Agua purificada"], benefits: ["Sabor único e irresistible", "Color vibrante", "Perfecto para eventos"] },
  "cereza-1000": { ingredients: ["Limón", "Cereza", "Agua purificada"], benefits: ["Sabor único e irresistible", "Color vibrante", "Perfecto para eventos"] },
  "cereza-2000": { ingredients: ["Limón", "Cereza", "Agua purificada"], benefits: ["Sabor único e irresistible", "Color vibrante", "Perfecto para eventos"] },

  // Zumo de Limonada con Coco — 3 presentaciones
  "coco-350":  { ingredients: ["Limón", "Coco", "Agua purificada"], benefits: ["Toque cremoso tropical", "Sabor diferenciador", "Refrescante en todo momento"] },
  "coco-1000": { ingredients: ["Limón", "Coco", "Agua purificada"], benefits: ["Toque cremoso tropical", "Sabor diferenciador", "Refrescante en todo momento"] },
  "coco-2000": { ingredients: ["Limón", "Coco", "Agua purificada"], benefits: ["Toque cremoso tropical", "Sabor diferenciador", "Refrescante en todo momento"] },

  // Zumo de Maracuyá — 3 presentaciones
  "maracuya-350":  { ingredients: ["Maracuyá", "Agua purificada"], benefits: ["Sabor exótico intenso", "Refrescante y vibrante", "Favorito para el verano"] },
  "maracuya-1000": { ingredients: ["Maracuyá", "Agua purificada"], benefits: ["Sabor exótico intenso", "Refrescante y vibrante", "Favorito para el verano"] },
  "maracuya-2000": { ingredients: ["Maracuyá", "Agua purificada"], benefits: ["Sabor exótico intenso", "Refrescante y vibrante", "Favorito para el verano"] },
};

async function main() {
  console.log(`Updating ${Object.keys(zumoUpdates).length} Zumo products in Supabase...\n`);

  for (const [id, { ingredients, benefits }] of Object.entries(zumoUpdates)) {
    const { error } = await supabase
      .from("products")
      .update({ ingredients, benefits })
      .eq("id", id);

    if (error) {
      console.error(`  ✗ ${id}: ${error.message}`);
    } else {
      console.log(`  ✓ ${id}`);
    }
  }

  console.log("\nDone.");
}

main().catch(console.error);
