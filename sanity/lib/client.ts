import { createClient } from "next-sanity";

// Fallback a "placeholder" cuando las env vars no están configuradas todavía.
// En ese caso los fetches fallan y las páginas usan los datos estáticos de /data/*.
export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2026-04-11",
  useCdn: true,
});
