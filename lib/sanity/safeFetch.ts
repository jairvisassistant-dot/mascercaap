import "server-only";
import { client } from "@/sanity/lib/client";

// Sanity solo está disponible cuando el proyecto está configurado correctamente.
// Un placeholder genera requests fallidas que tardan ~900ms antes de caer al fallback.
export const isSanityReady =
  !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "placeholder";

/**
 * Ejecuta una query GROQ contra Sanity si está disponible.
 * Si no lo está, o si la query falla, devuelve `fallback`.
 */
export async function safeFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
  revalidate = 3600
): Promise<T> {
  if (!isSanityReady) return fallback;
  try {
    return await client.fetch<T>(query, params, { next: { revalidate } });
  } catch {
    return fallback;
  }
}
