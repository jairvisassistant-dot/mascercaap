/**
 * Actualiza los 3 featured products en Sanity:
 *   1. Limón         → imagen SKU_Limon1000.webp
 *   2. Maracuyá      → imagen pulpa-maracuya1000.webp
 *   3. Kumis Yolito  → featured: true  + imagen Kumis-YolitoV2.webp
 *      Kumis Del Hato → featured: false
 *
 * Requisitos:
 *   SANITY_WRITE_TOKEN en .env.local (token con permisos de Editor o Admin)
 *
 * Cómo correr:
 *   npx tsx scripts/update-featured-images.ts
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
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
  console.error("   Creá uno en sanity.io/manage → API → Tokens → Add API token (Editor)");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token: writeToken,
  apiVersion: "2026-04-11",
  useCdn: false,
});

async function uploadImage(filename: string): Promise<string | null> {
  const localPath = path.join(process.cwd(), "public", "imgs", filename);
  if (!fs.existsSync(localPath)) {
    console.error(`   ❌ Imagen no encontrada: ${localPath}`);
    return null;
  }
  const buffer = fs.readFileSync(localPath);
  const asset = await client.assets.upload("image", buffer, {
    filename,
    contentType: "image/webp",
  });
  console.log(`   ✅ Imagen subida: ${filename} → ${asset._id}`);
  return asset._id;
}

function imageRef(assetId: string) {
  return { _type: "image", asset: { _type: "reference", _ref: assetId } };
}

async function run() {
  console.log(`\n🚀 Actualizando featured products en Sanity`);
  console.log(`   Proyecto: ${projectId} / Dataset: ${dataset}\n`);

  // ── 1. Limón → SKU_Limon1000.webp ─────────────────────────────────────────
  console.log("[ 1/4 ] Limón → SKU_Limon1000.webp");
  const limonAssetId = await uploadImage("SKU_Limon1000.webp");
  if (limonAssetId) {
    await client
      .patch("product-limon-600")
      .set({ image: imageRef(limonAssetId) })
      .commit();
    console.log("   ✅ product-limon-600 actualizado\n");
  }

  // ── 2. Maracuyá → pulpa-maracuya1000.webp ─────────────────────────────────
  console.log("[ 2/4 ] Maracuyá → pulpa-maracuya1000.webp");
  const maracuyaAssetId = await uploadImage("pulpa-maracuya1000.webp");
  if (maracuyaAssetId) {
    await client
      .patch("product-pulpa-maracuya-300")
      .set({ image: imageRef(maracuyaAssetId) })
      .commit();
    console.log("   ✅ product-pulpa-maracuya-300 actualizado\n");
  }

  // ── 3. Kumis Yolito → featured: true + imagen ─────────────────────────────
  console.log("[ 3/4 ] Kumis Yolito → featured: true + Kumis-YolitoV2.webp");
  const yolitoAssetId = await uploadImage("Kumis-YolitoV2.webp");
  const yolitoPatch: Record<string, unknown> = { featured: true };
  if (yolitoAssetId) yolitoPatch.image = imageRef(yolitoAssetId);
  await client
    .patch("product-kumiss-yolito-900ml")
    .set(yolitoPatch)
    .commit();
  console.log("   ✅ product-kumiss-yolito-900ml actualizado\n");

  // ── 4. Kumis Del Hato → featured: false ───────────────────────────────────
  console.log("[ 4/4 ] Kumis Del Hato → featured: false");
  await client
    .patch("product-kumiss-del-hato-250ml")
    .set({ featured: false })
    .commit();
  console.log("   ✅ product-kumiss-del-hato-250ml actualizado\n");

  console.log("✅ Listo. Los cambios ya están en Sanity.");
  console.log("   Revisá en: https://www.sanity.io/manage → tu proyecto → Vision");
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
