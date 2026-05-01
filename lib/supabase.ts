import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn("Supabase env vars missing — lead capture will not persist.");
}

export const supabase = url && key ? createClient(url, key) : null;
