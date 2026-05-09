/**
 * Define los 3 productos destacados del home y deshabilita el resto.
 *
 * Cards en orden:
 *   1. Zumo de Limón      → product-limon-600
 *   2. Pulpa de Maracuyá  → product-pulpa-maracuya-300
 *   3. Kumis Yolito       → product-kumiss-yolito-900ml
 *
 * Cómo correr:
 *   npx tsx scripts/set-featured-products.ts
 */

import { createClient } from "@sanity/client";
import { LexoRank } from "lexorank";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const writeToken = process.env.SANITY_WRITE_TOKEN;

if (!projectId) {
  console.error("❌ Falta NEXT_PUBLIC_SANITY_PROJECT_ID en .env.local");
  process.exit(1);
}
if (!writeToken) {
  console.error("❌ Falta SANITY_WRITE_TOKEN en .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token: writeToken,
  apiVersion: "2026-04-11",
  useCdn: false,
});

// Orden exacto de aparición en el home (card 1 → card 2 → card 3)
const FEATURED_ORDER = [
  "product-limon-600",
  "product-pulpa-maracuya-300",
  "product-kumiss-yolito-900ml",
];
const FEATURED_IDS = new Set(FEATURED_ORDER);

async function run() {
  console.log(`\n🚀 Configurando productos destacados`);
  console.log(`   Proyecto: ${projectId} / Dataset: ${dataset}\n`);

  const allDocs: { _id: string; name: string; orderRank: string }[] =
    await client.fetch(`*[_type == "product"]{ _id, name, orderRank }`);
  console.log(`   Total productos en Sanity: ${allDocs.length}`);

  // Genera 3 ranks consecutivos bien separados para los featured,
  // usando el rango medio del espacio LexoRank para no pisar otros docs.
  const baseRank = LexoRank.middle();
  const rank1 = baseRank.genNext();
  const rank2 = rank1.genNext();
  const rank3 = rank2.genNext();
  const featuredRanks: Record<string, string> = {
    "product-limon-600":          rank1.toString(),
    "product-pulpa-maracuya-300": rank2.toString(),
    "product-kumiss-yolito-900ml": rank3.toString(),
  };

  const transaction = client.transaction();

  for (const doc of allDocs) {
    const isFeatured = FEATURED_IDS.has(doc._id);
    const patch: Record<string, unknown> = { featured: isFeatured };
    if (isFeatured) patch.orderRank = featuredRanks[doc._id];
    transaction.patch(doc._id, (p) => p.set(patch));
  }

  await transaction.commit();

  console.log(`\n✅ Destacados configurados en orden:`);
  for (const id of FEATURED_ORDER) {
    const doc = allDocs.find((d) => d._id === id);
    console.log(`   ⭐ ${doc?.name ?? id} → orderRank: ${featuredRanks[id]}`);
  }

  const disabled = allDocs.length - FEATURED_IDS.size;
  console.log(`   ○  ${disabled} productos marcados como no destacados\n`);
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
