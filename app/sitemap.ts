import { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";

const baseUrl = "https://mascercap.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Fecha fija intencional — evita NEXT-06: new Date() sin args genera checksums distintos en cada build.
  // Actualizar manualmente al hacer cambios de contenido significativos.
  const now = new Date("2026-04-19");

  const staticPages = [
    { path: "", priority: 1, changefreq: "weekly" as const },
    { path: "/productos", priority: 0.9, changefreq: "weekly" as const },
    { path: "/nosotros", priority: 0.8, changefreq: "monthly" as const },
    { path: "/contacto", priority: 0.8, changefreq: "monthly" as const },
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