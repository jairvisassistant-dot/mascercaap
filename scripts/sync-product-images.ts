#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────
 * sync-product-images.ts  —  Fase 1: sincronización masiva de imágenes
 *
 * Escanea `public/imgs/`, matchea archivos contra productos en Supabase,
 * y opcionalmente sube a Storage + actualiza la DB.
 *
 * USO:
 *   npx tsx scripts/sync-product-images.ts                # dry-run (default)
 *   npx tsx scripts/sync-product-images.ts --apply         # upload + update
 *   npx tsx scripts/sync-product-images.ts --apply --replace  # también reemplaza existentes
 *   npx tsx scripts/sync-product-images.ts --filter=pulpa-maracuya  # filtrar por substring
 *   npx tsx scripts/sync-product-images.ts --help          # esta ayuda
 *
 * REQUISITOS:
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   - Bucket "product-images" creado en Supabase Storage
 * ─────────────────────────────────────────────────────────────────────────
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import {
  isSupportedImage,
  isNonProductAsset,
  matchFileToProducts,
  groupResults,
} from "@/lib/match-product-image";
import type { ProductBrief } from "@/lib/match-product-image";

// ── helpers ────────────────────────────────────────────────────────

const BUCKET = "product-images";
const STORAGE_PREFIX = "products/";
const IMGS_DIR = path.resolve(process.cwd(), "public/imgs");

function color(status: string, text: string): string {
  const c: Record<string, string> = {
    green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m",
    cyan: "\x1b[36m", dim: "\x1b[2m", reset: "\x1b[0m",
  };
  return `${c[status] ?? ""}${text}${c.reset}`;
}

function fmt(s: string): string {
  return s.padEnd(50);
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function divider() {
  console.log(color("dim", "─".repeat(68)));
}

// ── main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const FLAG_APPLY = args.includes("--apply");
  const FLAG_REPLACE = args.includes("--replace");
  const FLAG_HELP = args.includes("--help");
  const FILTER = args.find((a) => a.startsWith("--filter="))?.split("=")[1] ?? null;

  if (FLAG_HELP) {
    console.log(`
  sync-product-images.ts — sincronización de imágenes de productos

  Modos:
    (sin flags)     Dry-run: muestra qué se subiría sin hacer cambios
    --apply         Ejecuta: sube a Storage y actualiza productos en DB
    --replace       (con --apply) también reemplaza imágenes existentes
    --filter=X      Solo procesa archivos cuyo nombre contenga X
    --help          Esta ayuda
  `);
    return;
  }

  console.log("");
  console.log(color("cyan", "╔══════════════════════════════════════════════╗"));
  console.log(color("cyan", "║   Sincronización de imágenes de productos    ║"));
  console.log(color("cyan", `║   Modo: ${FLAG_APPLY ? "APPLY 🚀" : "DRY-RUN 👁️"}${FLAG_REPLACE ? " + replace" : ""}           ║`));
  console.log(color("cyan", "╚══════════════════════════════════════════════╝"));
  console.log("");

  // ── 1. Scan files ────────────────────────────────────────────────
  if (!fs.existsSync(IMGS_DIR)) {
    console.error(`❌ No existe el directorio: ${IMGS_DIR}`);
    process.exit(1);
  }

  const allEntries = fs.readdirSync(IMGS_DIR);
  console.log(`📂 Escaneando ${allEntries.length} archivos en public/imgs/`);

  // ── 2. Fetch products ────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("📦 Obteniendo productos desde Supabase...");
  const { data: products, error: prodErr } = await sb
    .from("products")
    .select("id, line, presentation, image")
    .eq("active", true);

  if (prodErr) {
    console.error(`❌ Error fetching products: ${prodErr.message}`);
    process.exit(1);
  }
  if (!products || products.length === 0) {
    console.error("❌ No se encontraron productos activos en la DB.");
    process.exit(1);
  }
  console.log(`   → ${products.length} productos activos cargados.\n`);

  // ── 3. Match files ───────────────────────────────────────────────
  const files: string[] = [];
  const skippedFiles: string[] = [];
  const unsupportedFiles: string[] = [];

  for (const entry of allEntries) {
    if (!isSupportedImage(entry)) {
      unsupportedFiles.push(entry);
      continue;
    }
    if (isNonProductAsset(entry)) {
      skippedFiles.push(entry);
      continue;
    }
    if (FILTER && !entry.toLowerCase().includes(FILTER.toLowerCase())) {
      skippedFiles.push(entry);
      continue;
    }
    files.push(entry);
  }

  const prodBriefs: ProductBrief[] = products.map((p) => ({
    id: p.id,
    line: p.line,
    presentation: p.presentation,
    image: p.image,
  }));

  const results = files.map((f) => matchFileToProducts(f, prodBriefs));
  const group = groupResults(results, files);

  // ── 4. Report ────────────────────────────────────────────────────
  if (group.pending.length > 0) {
    console.log(color("green", `✅ LISTOS PARA SUBIR (${group.pending.length}):`));
    divider();
    for (const { file, product } of group.pending) {
      const filepath = path.join(IMGS_DIR, file);
      const stat = fs.statSync(filepath);
      console.log(
        `   ${color("green", "✓")} ${fmt(file)} → ${product.id} (image: null)  ${color("dim", formatBytes(stat.size))}`,
      );
    }
    console.log("");
  }

  if (group.existing.length > 0) {
    console.log(color("yellow", `🟡 YA TIENEN IMAGEN (${group.existing.length}):`));
    divider();
    for (const { file, product } of group.existing) {
      const img = product.image ?? "";
      console.log(
        `   ${color("yellow", "○")} ${fmt(file)} → ${product.id}  ${color("dim", img.length > 40 ? img.slice(0, 40) + "…" : img)}`,
      );
    }
    console.log("");
  }

  if (group.ambiguous.length > 0) {
    console.log(color("red", `🔶 AMBIGUOS (${group.ambiguous.length}):`));
    divider();
    for (const r of group.ambiguous) {
      if (r.type !== "multiple") continue;
      console.log(`   ${color("red", "?")} ${fmt(r.file)} — ${r.reason}`);
      for (const c of r.candidates) {
        console.log(`     ${color("dim", "├─")} ${c.id} (line=${c.line}, pres=${c.presentation})`);
      }
    }
    console.log("");
  }

  if (group.noMatch.length > 0) {
    console.log(color("red", `❌ SIN COINCIDENCIA (${group.noMatch.length}):`));
    divider();
    for (const r of group.noMatch) {
      if (r.type !== "none") continue;
      console.log(`   ${color("red", "✗")} ${fmt(r.file)} — ${r.reason}`);
    }
    console.log("");
  }

  if (skippedFiles.length > 0) {
    console.log(color("dim", `⏭️  Omitidos (${skippedFiles.length}): ${skippedFiles.join(", ")}`));
  }
  if (unsupportedFiles.length > 0) {
    console.log(color("dim", `   No-soportados (${unsupportedFiles.length}): ${unsupportedFiles.join(", ")}`));
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("");
  divider();
  console.log(
    `Resumen: ${color("green", String(group.pending.length))} pendientes  ` +
      `${color("yellow", String(group.existing.length))} con imagen  ` +
      `${color("red", String(group.ambiguous.length))} ambiguos  ` +
      `${color("red", String(group.noMatch.length))} sin match  ` +
      `${color("dim", String(skippedFiles.length))} omitidos`,
  );
  console.log("");

  if (!FLAG_APPLY) {
    console.log(color("yellow", "👁️  DRY-RUN — no se realizaron cambios."));
    console.log(color("yellow", "   Ejecutá con --apply para subir y actualizar.\n"));
    return;
  }

  // ── 5. APPLY mode ────────────────────────────────────────────────
  const toProcess = FLAG_REPLACE
    ? [...group.pending, ...group.existing]
    : group.pending;

  if (toProcess.length === 0) {
    console.log("✅ Nada que procesar.\n");
    return;
  }

  console.log(color("green", `\n🚀 SUBIENDO ${toProcess.length} IMAGEN(ES)...\n`));

  let successCount = 0;
  let failCount = 0;

  for (const { file, product } of toProcess) {
    const filepath = path.join(IMGS_DIR, file);
    const ext = path.extname(file).toLowerCase() || ".webp";
    const contentType =
      ext === ".png" ? "image/png"
      : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : "image/webp";

    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(filepath);
    } catch (err) {
      console.error(`   ${color("red", "✗")} Error leyendo ${file}: ${err}`);
      failCount++;
      continue;
    }

    if (fileBuffer.length > 2 * 1024 * 1024) {
      console.error(
        `   ${color("red", "✗")} ${fmt(file)} supera 2MB (${formatBytes(fileBuffer.length)}) — saltando`,
      );
      failCount++;
      continue;
    }

    const storageFilename = `${STORAGE_PREFIX}${randomUUID()}${ext}`;
    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(storageFilename, fileBuffer, { contentType, upsert: false });

    if (uploadErr) {
      console.error(`   ${color("red", "✗")} ${fmt(file)} → upload error: ${uploadErr.message}`);
      failCount++;
      continue;
    }

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(storageFilename);

    const { error: updateErr } = await sb
      .from("products")
      .update({ image: publicUrl })
      .eq("id", product.id);

    if (updateErr) {
      console.error(`   ${color("red", "✗")} ${fmt(file)} → DB update error: ${updateErr.message}`);
      failCount++;
      continue;
    }

    console.log(`   ${color("green", "✓")} ${fmt(file)} → ${product.id}`);
    console.log(`     ${color("dim", publicUrl)}`);
    successCount++;
  }

  console.log("");
  divider();
  console.log(
    `Final: ${color("green", `${successCount} exitosas`)}  ${failCount > 0 ? color("red", `${failCount} fallos`) : color("green", "0 fallos")}`,
  );
  console.log("");

  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
