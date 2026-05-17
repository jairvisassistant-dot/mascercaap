import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.warn("Supabase env vars missing — usando datos estáticos como fallback.");
}

// Admin client — bypasses RLS. Use only in server-side admin operations.
export const supabase = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

// Public client — subject to RLS. Use for all public reads and user-initiated writes.
export const supabasePublic = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;
