// Migra los 47 productos y 3 testimonios de los archivos estáticos a Supabase.
// Uso: npx tsx scripts/migrate-to-supabase.ts
// Se puede ejecutar más de una vez (upsert por id).

import { createClient } from "@supabase/supabase-js";
import { products } from "../data/products";
import { testimonials } from "../data/testimonials";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("ERROR: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  process.exit(1);
}

const client = createClient(url, key);

const featuredIds = new Set(["limon-600", "pulpa-maracuya-300", "kumiss-yolito-250ml"]);

async function migrateProducts() {
  const rows = products.map((p, index) => ({
    id: p.id,
    name: p.name,
    line: p.line,
    presentation: p.presentation,
    presentation_order: p.presentationOrder,
    price: p.price ?? null,
    image: p.image,
    description: p.description,
    ingredients: p.ingredients ?? [],
    benefits: p.benefits ?? [],
    is_sold_out: p.isSoldOut ?? false,
    is_best_seller: p.isBestSeller ?? false,
    featured: featuredIds.has(p.id),
    active: true,
    display_order: index,
  }));

  const { error } = await client.from("products").upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Error migrando productos:", error.message);
    process.exit(1);
  }

  const { count, error: countError } = await client
    .from("products")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error verificando count:", countError.message);
    process.exit(1);
  }

  const ok = count === rows.length ? "✓" : "⚠";
  console.log(`${ok} Productos: ${rows.length} enviados → ${count} en DB`);

  if (count !== rows.length) {
    console.warn("  El count no coincide — puede haber registros previos con otros IDs.");
  }
}

async function migrateTestimonials() {
  const rows = testimonials.map((t) => ({
    id: t.id,
    name: t.name,
    role: t.role,
    role_en: t.role_en ?? null,
    text: t.text,
    text_en: t.text_en ?? null,
    rating: t.rating,
    active: true,
  }));

  const { error } = await client.from("testimonials").upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Error migrando testimonios:", error.message);
    process.exit(1);
  }

  const { count, error: countError } = await client
    .from("testimonials")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error verificando count:", countError.message);
    process.exit(1);
  }

  console.log(`✓ Testimonios: ${rows.length} enviados → ${count} en DB`);
}

async function main() {
  console.log("Iniciando migración a Supabase...\n");
  await migrateProducts();
  await migrateTestimonials();
  console.log("\nMigración completa.");
}

main();
