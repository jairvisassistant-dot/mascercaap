/**
 * Crea la tabla product_lines usando la función exec_sql via RPC de Supabase.
 * Si no funciona el RPC, ejecuta el SQL manualmente en Supabase SQL Editor.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DDL = `
CREATE TABLE IF NOT EXISTS public.product_lines (
  key           text PRIMARY KEY,
  label         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  gradient      text NOT NULL DEFAULT 'from-lime-400 to-green-500',
  icon_emoji    text NOT NULL DEFAULT '🛍️',
  chip_image    text,
  display_order int NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
`;

async function main() {
  // Intentar crear con un INSERT que fuerza la creación implícita via PostgREST
  // PostgREST no soporta DDL, así que usamos un workaround con fetch al endpoint SQL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${url}/rest/v1/`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  // Intentar via RPC si existe la función exec_sql
  const rpcRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: DDL }),
  });

  if (rpcRes.ok) {
    console.log("✓ Tabla creada via RPC exec_sql");
    return;
  }

  console.log("⚠️  No se pudo crear automáticamente. Ejecuta este SQL en el editor SQL de Supabase:");
  console.log("\n" + DDL);
  console.log("\nURL del editor: https://supabase.com/dashboard/project/vdczugkjkjtptomuwrle/sql/new");
}

main().catch(console.error);
