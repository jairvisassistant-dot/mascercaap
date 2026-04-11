import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://mascercap.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-04-09"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: new Date("2026-04-09"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nosotros`,
      lastModified: new Date("2026-04-09"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: new Date("2026-04-09"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}