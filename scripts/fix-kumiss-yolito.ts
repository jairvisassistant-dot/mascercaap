// Migración puntual: renombra kumiss-yolito-900ml → kumiss-yolito-250ml
// y reordena los lácteos (Hato Kumis, Hato Yogurt, Yolito).
// Uso: npx tsx scripts/fix-kumiss-yolito.ts
// Ejecutar UNA sola vez — verificar con "Resultado" antes de cerrar.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("ERROR: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const client = createClient(url, key);

async function run() {
  // 1. Leer el registro original para no perder ningún campo
  const { data: original, error: fetchError } = await client
    .from("products")
    .select("*")
    .eq("id", "kumiss-yolito-900ml")
    .single();

  if (fetchError || !original) {
    console.error("✗ No se encontró kumiss-yolito-900ml:", fetchError?.message ?? "sin datos");
    process.exit(1);
  }

  console.log("✓ Registro original encontrado:", original.id);

  // 2. Insertar con el nuevo ID, presentación, precio y orden
  const { error: insertError } = await client.from("products").insert({
    ...original,
    id: "kumiss-yolito-250ml",
    presentation: "250ml",
    presentation_order: 3,
    price: 3400,
  });

  if (insertError) {
    console.error("✗ Error al insertar kumiss-yolito-250ml:", insertError.message);
    process.exit(1);
  }

  console.log("✓ Insertado: kumiss-yolito-250ml — 250ml — $3.400 — orden 3");

  // 3. Eliminar el registro viejo
  const { error: deleteError } = await client
    .from("products")
    .delete()
    .eq("id", "kumiss-yolito-900ml");

  if (deleteError) {
    console.error("✗ Error al eliminar kumiss-yolito-900ml:", deleteError.message);
    console.warn("  El registro nuevo ya fue insertado — eliminá el viejo manualmente en el dashboard.");
    process.exit(1);
  }

  console.log("✓ Eliminado: kumiss-yolito-900ml");

  // 4. Actualizar el orden del Yogurt Del Hato
  const { error: yogurtError } = await client
    .from("products")
    .update({ presentation_order: 2 })
    .eq("id", "yogurt-del-hato-250ml");

  if (yogurtError) {
    console.error("✗ Error actualizando yogurt-del-hato-250ml:", yogurtError.message);
    process.exit(1);
  }

  console.log("✓ Actualizado: yogurt-del-hato-250ml — orden 2");

  console.log("\nMigración completa. Orden final de lácteos:");
  console.log("  1. kumiss-del-hato-250ml");
  console.log("  2. yogurt-del-hato-250ml");
  console.log("  3. kumiss-yolito-250ml");
}

run();
