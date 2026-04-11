import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { client } from "./client";

const builder = imageUrlBuilder(client);

/**
 * Genera URL del CDN de Sanity con transformaciones opcionales.
 * Uso: urlFor(source).width(800).url()
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
