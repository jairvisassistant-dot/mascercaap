import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn("Supabase env vars missing — usando datos estáticos como fallback.");
}

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;
