import type { NextConfig } from "next";
import { buildEnforcedCsp, buildReportOnlyCsp } from "./lib/security/csp";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75, 80],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
      // Supabase Storage — imágenes subidas desde /admin (bucket: product-images)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const csp = buildEnforcedCsp(isDev);
    const cspReportOnly = buildReportOnlyCsp(isDev);

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          ...(cspReportOnly
            ? [{ key: "Content-Security-Policy-Report-Only", value: cspReportOnly }]
            : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
