/**
 * Crea la tabla product_lines en Supabase y la pobla con las líneas existentes.
 *
 * PASO 1 (solo la primera vez): ejecuta el siguiente SQL en el editor SQL de Supabase:
 *
 * CREATE TABLE IF NOT EXISTS public.product_lines (
 *   key          text PRIMARY KEY,
 *   label        text NOT NULL,
 *   description  text NOT NULL DEFAULT '',
 *   gradient     text NOT NULL DEFAULT 'from-primary to-primary-dark',
 *   icon_emoji   text NOT NULL DEFAULT '🛍️',
 *   chip_image   text,
 *   display_order int NOT NULL DEFAULT 0,
 *   active       boolean NOT NULL DEFAULT true,
 *   created_at   timestamptz NOT NULL DEFAULT now()
 * );
 *
 * PASO 2: ejecuta este script con `npx tsx scripts/setup-product-lines.ts`
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { productLines } from "../data/products";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Verifica que la tabla exista
  const { error: checkErr } = await sb.from("product_lines").select("key").limit(1);
  if (checkErr) {
    console.error("❌ La tabla product_lines no existe. Crea la tabla primero ejecutando el SQL del comentario en la cabecera de este archivo en el editor SQL de Supabase.");
    process.exit(1);
  }

  const rows = productLines.map((line, i) => ({
    key:           line.key,
    label:         line.label,
    description:   line.description,
    gradient:      line.gradient,
    icon_emoji:    line.iconEmoji,
    chip_image:    line.chipImage ?? null,
    display_order: i,
    active:        true,
  }));

  const { error } = await sb
    .from("product_lines")
    .upsert(rows, { onConflict: "key" });

  if (error) {
    console.error("❌ Error al poblar las líneas:", error.message);
    process.exit(1);
  }

  console.log(`✓ ${rows.length} líneas de producto guardadas en Supabase.`);
}

main().catch(console.error);
