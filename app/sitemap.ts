import { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/config";

const baseUrl = SITE_CONFIG.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  // Fecha fija intencional — evita NEXT-06: new Date() sin args genera checksums distintos en cada build
  // y dispara re-indexación innecesaria en Google Search Console.
  // CHECKLIST DE RELEASE: actualizar esta fecha cuando cambie contenido estructural
  // (nuevas rutas, nuevas páginas de producto, cambios de URL). No actualizar para edits de copy.
  const now = new Date("2026-05-13");

  const staticPages = [
    { path: "", priority: 1, changefreq: "weekly" as const },
    { path: "/productos", priority: 0.9, changefreq: "weekly" as const },
    { path: "/nosotros", priority: 0.8, changefreq: "monthly" as const },
    { path: "/contacto", priority: 0.8, changefreq: "monthly" as const },
    { path: "/politicas", priority: 0.3, changefreq: "yearly" as const },
    { path: "/terminos", priority: 0.3, changefreq: "yearly" as const },
  ];

  return locales.flatMap((lang) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${lang}${page.path}`,
      lastModified: now,
      changeFrequency: page.changefreq,
      priority: page.priority,
    }))
  );
}
