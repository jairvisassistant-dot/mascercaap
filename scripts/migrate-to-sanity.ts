/**
 * Script de migración/sync: sincroniza productos de data/products.ts con Sanity CMS.
 *
 * Comportamiento:
 *   - Si el documento YA EXISTE en Sanity → solo actualiza la imagen (preserva
 *     featured, isBestSeller, isSoldOut, orderRank configurados en el Studio).
 *   - Si el documento NO EXISTE → lo crea completo con todos los campos.
 *
 * Casos de uso:
 *   · Primera migración (todos los docs son nuevos)
 *   · Sync de imágenes después de reemplazar/optimizar archivos en /public/imgs/
 *
 * Requisitos previos:
 *   1. Haber corrido: npx sanity@latest init --env .env.local
 *   2. Crear un token con permisos de ESCRITURA en sanity.io/manage
 *   3. Agregar SANITY_WRITE_TOKEN a .env.local
 *
 * Cómo correr:
 *   npx tsx scripts/migrate-to-sanity.ts
 *
 * Es idempotente: podés correrlo múltiples veces sin duplicados ni pérdida de datos.
 */

import { createClient } from "@sanity/client";
import { LexoRank } from "lexorank";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Carga .env.local manualmente (dotenv no lo hace por defecto)
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Importar datos estáticos
import { products } from "../data/products";

// ─── Cliente con token de escritura ───────────────────────────────────────────

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const writeToken = process.env.SANITY_WRITE_TOKEN;

if (!projectId) {
  console.error("❌ Falta NEXT_PUBLIC_SANITY_PROJECT_ID en .env.local");
  console.error("   Corré: npx sanity@latest init --env .env.local");
  process.exit(1);
}

if (!writeToken) {
  console.error("❌ Falta SANITY_WRITE_TOKEN en .env.local");
  console.error("   Creá un token en sanity.io/manage → API → Tokens → Add API token");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token: writeToken,
  apiVersion: "2026-04-11",
  useCdn: false, // siempre false para writes
});

// ─── Sube imagen local al CDN de Sanity ───────────────────────────────────────

async function uploadImage(imagePath: string): Promise<string | null> {
  // imagePath puede tener %20 (ej: "/imgs/fotos/SKU_Limon600%20.webp")
  const decoded = decodeURIComponent(imagePath);

  // Intentar distintas rutas (con y sin subdirectorio /fotos/)
  const candidates = [
    path.join(process.cwd(), "public", decoded),
    path.join(process.cwd(), "public", decoded.replace("/fotos/", "/")),
    path.join(process.cwd(), "public", decoded.replace("/imgs/fotos/", "/imgs/")),
  ];

  const localPath = candidates.find(fs.existsSync);

  if (!localPath) {
    console.warn(`   ⚠️  Imagen no encontrada: ${decoded}`);
    return null;
  }

  const buffer = fs.readFileSync(localPath);
  const filename = path.basename(localPath);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const contentType =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" : "image/jpeg";

  try {
    const asset = await client.assets.upload("image", buffer, {
      filename,
      contentType,
    });
    console.log(`   ✅ Imagen subida: ${filename}`);
    return asset._id;
  } catch (err) {
    console.error(`   ❌ Error subiendo ${filename}:`, err);
    return null;
  }
}

// ─── Migración / Sync principal ───────────────────────────────────────────────

async function migrate() {
  console.log(`\n🚀 Iniciando sync con Sanity`);
  console.log(`   Proyecto: ${projectId}`);
  console.log(`   Dataset:  ${dataset}`);
  console.log(`   Total productos en catálogo: ${products.length}\n`);

  // Trae los docs existentes con el filename actual del asset en Sanity
  const existing: { _id: string; imageFilename: string | null }[] =
    await client.fetch(
      `*[_type == "product"]{ _id, "imageFilename": image.asset->originalFilename }`
    );
  const existingMap = new Map(existing.map((d) => [d._id, d.imageFilename]));
  console.log(`   Docs existentes en Sanity: ${existingMap.size}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // LexoRank solo se usa al CREAR documentos nuevos
  let currentRank = LexoRank.min();

  for (const [index, product] of products.entries()) {
    const docId = `product-${product.id}`;
    const isNew = !existingMap.has(docId);
    const localFilename = product.image ? path.basename(decodeURIComponent(product.image)) : null;
    const sanityFilename = existingMap.get(docId) ?? null;

    const imageChanged = localFilename !== sanityFilename;
    const label = isNew ? "NUEVO" : imageChanged ? "SYNC " : "OK   ";
    console.log(`[${index + 1}/${products.length}] [${label}] ${product.id}`);

    if (!isNew && !imageChanged) {
      // Imagen idéntica en Sanity → nada que hacer
      console.log(`   ⏭  Imagen sin cambios (${sanityFilename ?? "sin imagen"})`);
      skipped++;
      continue;
    }

    // Subir imagen solo si cambió o es nuevo
    let imageRef: object | undefined;
    if (product.image) {
      const assetId = await uploadImage(product.image);
      if (assetId) {
        imageRef = {
          _type: "image",
          asset: { _type: "reference", _ref: assetId },
        };
      }
    }

    try {
      if (isNew) {
        // Documento nuevo → crear completo
        currentRank = currentRank.genNext().genNext();
        await client.createOrReplace({
          _type: "product",
          _id: docId,
          id: { _type: "slug", current: product.id },
          name: product.name,
          line: product.line,
          presentation: product.presentation,
          presentationOrder: product.presentationOrder,
          ...(product.price !== undefined && { price: product.price }),
          ...(imageRef && { image: imageRef }),
          description: product.description,
          ingredients: product.ingredients ?? [],
          benefits: product.benefits ?? [],
          isSoldOut: false,
          isBestSeller: false,
          featured: false,
          orderRank: currentRank.toString(),
        });
        console.log(`   ✅ Creado`);
        created++;
      } else {
        // Imagen cambió → patch solo el campo image
        if (imageRef) {
          await client.patch(docId).set({ image: imageRef }).commit();
          console.log(`   ✅ Imagen actualizada (${sanityFilename} → ${localFilename})`);
        } else {
          console.log(`   ⚠️  Sin imagen local, omitido`);
        }
        updated++;
      }
    } catch (err) {
      console.error(`   ❌ Error:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Sync completado:`);
  console.log(`   🆕 Creados:          ${created}`);
  console.log(`   🔄 Imágenes sync:    ${updated}`);
  console.log(`   ⏭  Sin cambios:      ${skipped}`);
  if (errors > 0) console.log(`   ❌ Errores:          ${errors}`);
  console.log(`\n📌 Próximos pasos:`);
  console.log(`   1. Abrí el Studio: http://localhost:3000/studio`);
  console.log(`   2. Revisá los productos en "Productos"`);
  console.log(`   3. Ajustá los "Destacados" según los que querés en el home`);
  console.log(`   4. Marcá los "Más Vendidos" que correspondan\n`);
}

migrate().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
