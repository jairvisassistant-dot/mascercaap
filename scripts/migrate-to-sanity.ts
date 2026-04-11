/**
 * Script de migración one-time: mueve los productos estáticos de data/products.ts
 * a Sanity CMS, incluyendo la subida de imágenes al asset CDN.
 *
 * Requisitos previos:
 *   1. Haber corrido: npx sanity@latest init --env .env.local
 *   2. Crear un token con permisos de ESCRITURA en sanity.io/manage
 *   3. Agregar SANITY_WRITE_TOKEN a .env.local
 *
 * Cómo correr:
 *   npx tsx scripts/migrate-to-sanity.ts
 *
 * Es idempotente: usa createOrReplace con IDs deterministas.
 * Podés correrlo múltiples veces sin generar duplicados.
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

// ─── Migración principal ───────────────────────────────────────────────────────

async function migrate() {
  console.log(`\n🚀 Iniciando migración a Sanity`);
  console.log(`   Proyecto: ${projectId}`);
  console.log(`   Dataset:  ${dataset}`);
  console.log(`   Total productos: ${products.length}\n`);

  let successCount = 0;
  let errorCount = 0;

  // Genera ranks LexoRank secuenciales — el mismo algoritmo que usa el botón
  // "Reset Order" del plugin @sanity/orderable-document-list.
  let currentRank = LexoRank.min();

  for (const [index, product] of products.entries()) {
    console.log(`[${index + 1}/${products.length}] Migrando: ${product.id}`);
    // Avanza dos pasos (igual que resetOrder) para dejar espacio antes del primer item
    currentRank = currentRank.genNext().genNext();

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

    // Los primeros 6 productos con imagen se marcan como "featured"
    // para replicar la lógica actual del home (products.filter(p => p.image !== "").slice(0, 6))
    const isFeaturedCandidate = Boolean(product.image) && index < 10;

    try {
      await client.createOrReplace({
        _type: "product",
        // ID determinista — correr el script múltiples veces no crea duplicados
        _id: `product-${product.id}`,
        id: {
          _type: "slug",
          current: product.id,
        },
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
        featured: isFeaturedCandidate,
        // Campo requerido por @sanity/orderable-document-list.
        // Sin esto el Studio muestra "X documents have no order".
        orderRank: currentRank.toString(),
      });

      console.log(`   ✅ Creado en Sanity`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Error:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Migración completada:`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  if (errorCount > 0) console.log(`   ❌ Errores: ${errorCount}`);
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
