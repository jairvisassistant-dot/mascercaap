import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if ((!url || !anonKey) && process.env.NODE_ENV !== "production") {
  console.warn("Supabase env vars missing — usando datos estáticos como fallback.");
}

// Public client — subject to RLS. Use for all public reads and user-initiated writes.
export const supabasePublic = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

// Admin client — bypasses RLS. Use only in API routes and server actions.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;
