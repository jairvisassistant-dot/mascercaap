import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Turbopack/webpack intente bundlear Sanity Studio internamente.
  // Sin esto, React.createContext falla durante el build del /studio route.
  serverExternalPackages: ["sanity", "@sanity/ui", "@sanity/icons"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      // Sanity CDN — imágenes subidas desde el Studio
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Evita que el Studio sea indexado por buscadores
        source: "/studio/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;