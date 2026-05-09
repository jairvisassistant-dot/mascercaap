// Actualiza precios en Supabase según Lista-Precios.md y ListaPreciosZumos.jpeg
// Uso: npx tsx scripts/update-prices.ts
// Es idempotente — se puede ejecutar más de una vez.
//
// ⚠️ Pendientes de resolución:
//   - ZUMO LIMÓN 350ml ($3.600): no existe en el catálogo (el menor es limon-600)
//   - KUMIS YOLITO X 250 ($3.400): el catálogo registra kumiss-yolito-900ml — verificar si es el mismo producto

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("ERROR: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  process.exit(1);
}

const client = createClient(url, key);

// Fuente: Otros/Lista-Precios.md — precios en COP (sin decimales)
const prices: Record<string, number> = {
  // Pulpa de Fresa
  "pulpa-fresa-120":  2300,
  "pulpa-fresa-300":  4200,
  "pulpa-fresa-1000": 13000,

  // Pulpa de Frutos Amarillos
  "pulpa-frutos-amarillos-120":  2300,
  "pulpa-frutos-amarillos-300":  4200,
  "pulpa-frutos-amarillos-1000": 13000,

  // Pulpa de Frutos Rojos
  "pulpa-frutos-rojos-120":  2300,
  "pulpa-frutos-rojos-300":  4200,
  "pulpa-frutos-rojos-1000": 13000,

  // Pulpa de Guanábana
  "pulpa-guanabana-120":  2900,
  "pulpa-guanabana-300":  4850,
  "pulpa-guanabana-1000": 15500,

  // Pulpa de Lulo
  "pulpa-lulo-120":  2300,
  "pulpa-lulo-300":  4200,
  "pulpa-lulo-1000": 13000,

  // Pulpa de Mango
  "pulpa-mango-120":  2300,
  "pulpa-mango-300":  4200,
  "pulpa-mango-1000": 13000,

  // Pulpa de Maracuyá
  "pulpa-maracuya-120":  2900,
  "pulpa-maracuya-300":  4850,
  "pulpa-maracuya-1000": 15500,

  // Pulpa de Mora (300g es 4.400, no 4.200)
  "pulpa-mora-120":  2300,
  "pulpa-mora-300":  4400,
  "pulpa-mora-1000": 13000,

  // Pulpa de Guayaba (sin presentación 120g)
  "pulpa-guayaba-300":  4000,
  "pulpa-guayaba-1000": 12000,

  // Pulpa de Tomate de Árbol (sin presentación 120g)
  "pulpa-tomate-arbol-300":  4000,
  "pulpa-tomate-arbol-1000": 12000,

  // Zumo de Limón — fuente: Otros/ListaPreciosZumos.jpeg
  // (no existe limon-350 en el catálogo — omitido hasta confirmar)
  "limon-600":  5600,
  "limon-1000": 9000,
  "limon-2000": 16000,
  "limon-5000": 36000,

  // Zumo Limonada de Coco — fuente: Otros/ListaPreciosZumos.jpeg
  "coco-350":  4800,
  "coco-1000": 10000,
  "coco-2000": 18000,

  // Zumo Limonada de Cereza — fuente: Otros/ListaPreciosZumos.jpeg
  "cereza-350":  4800,
  "cereza-1000": 10000,
  "cereza-2000": 18000,

  // Zumo de Maracuyá — fuente: Otros/ListaPreciosZumos.jpeg
  "maracuya-350":  4800,
  "maracuya-1000": 10000,
  "maracuya-2000": 18000,

  // Lácteos — fuente: Otros/ListaPreciosZumos.jpeg
  "kumiss-del-hato-250ml":  3700,
  "yogurt-del-hato-250ml":  3700,
  "kumiss-yolito-250ml":    3400,
};

async function updatePrices() {
  const entries = Object.entries(prices);
  let updated = 0;
  let errors = 0;

  console.log(`Actualizando precios de ${entries.length} productos...\n`);

  for (const [id, price] of entries) {
    const { error } = await client
      .from("products")
      .update({ price })
      .eq("id", id);

    if (error) {
      console.error(`  ✗ ${id}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${id}: $${price.toLocaleString("es-CO")}`);
      updated++;
    }
  }

  console.log(`\nResultado: ${updated} actualizados, ${errors} errores.`);

  if (errors > 0) process.exit(1);
}

updatePrices();
