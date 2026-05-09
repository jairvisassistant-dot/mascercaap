import "server-only";
import { client } from "@/sanity/lib/client";

// Sanity solo está disponible cuando el proyecto está configurado correctamente.
// Un placeholder genera requests fallidas que tardan ~900ms antes de caer al fallback.
export const isSanityReady =
  !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "placeholder";

// ESTRATEGIA DE FUENTE DUAL — estado deliberado, no deuda técnica.
// data/products.ts actúa como fallback hasta que Sanity sea la única fuente de verdad.
// Criterio de migración: todos los productos tienen image, name, description y price en Sanity
// → cuando se cumpla, eliminar el parámetro fallback de todas las llamadas a safeFetch
// y borrar data/products.ts. Rastrear avance en Otros/Info_Auditorias/.

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
