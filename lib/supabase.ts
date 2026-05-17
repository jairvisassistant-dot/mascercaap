import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase env vars missing — usando datos estáticos como fallback.");
}

// Public client — subject to RLS. Use for all public reads and user-initiated writes.
export const supabasePublic = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;
