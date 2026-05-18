/**
 * Corrige las descripciones de los Zumos en Supabase.
 * Motivo: las descripciones anteriores sugerían consumo directo.
 * Estos productos son concentrados que deben diluirse antes de consumir.
 * Ejecutar: npx tsx scripts/archive/update-zumos-descriptions.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const zumoDescriptions: Record<string, string> = {
  // Zumo de Limón — 4 presentaciones
  "limon-600":  "Concentrado para preparar tus limonadas frescas en casa cuando quieras.",
  "limon-1000": "Rinde para preparar múltiples porciones de limonada para toda la familia.",
  "limon-2000": "Ideal para negocios y hogares que preparan limonada en grandes volúmenes.",
  "limon-5000": "Formato institucional para restaurantes, cafeterías y eventos con alta demanda.",

  // Zumo de Limonada con Cereza — 3 presentaciones
  "cereza-350":  "Concentrado personal para preparar limonada con un toque especial de cereza.",
  "cereza-1000": "Rinde para preparar limonada con cereza para compartir en casa o pequeños eventos.",
  "cereza-2000": "Ideal para negocios que preparan bebidas con cereza en grandes volúmenes.",

  // Zumo de Limonada con Coco — 3 presentaciones
  "coco-350":  "Concentrado personal para preparar una refrescante limonada tropical con coco.",
  "coco-1000": "Rinde para preparar limonada tropical con coco para compartir en familia.",
  "coco-2000": "Ideal para negocios que preparan bebidas tropicales de coco en alto volumen.",

  // Zumo de Maracuyá — 3 presentaciones
  "maracuya-350":  "Concentrado personal para preparar jugos o bebidas de maracuyá cuando quieras.",
  "maracuya-1000": "Rinde para preparar jugos de maracuyá para toda la familia.",
  "maracuya-2000": "Ideal para negocios que preparan bebidas de maracuyá en grandes volúmenes.",
};

async function main() {
  console.log(`Actualizando descripciones de ${Object.keys(zumoDescriptions).length} productos Zumo...\n`);

  for (const [id, description] of Object.entries(zumoDescriptions)) {
    const { error } = await supabase
      .from("products")
      .update({ description })
      .eq("id", id);

    if (error) {
      console.error(`  ✗ ${id}: ${error.message}`);
    } else {
      console.log(`  ✓ ${id}: ${description.slice(0, 60)}...`);
    }
  }

  console.log("\nListo.");
}

main().catch(console.error);
