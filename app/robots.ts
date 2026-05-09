import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio/", "/api/"],
      },
    ],
    sitemap: `${SITE_CONFIG.siteUrl}/sitemap.xml`,
  };
}
