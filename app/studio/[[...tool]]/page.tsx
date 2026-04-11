"use client";

import dynamic from "next/dynamic";
import config from "@/sanity.config";

// Carga el Studio solo en el cliente — nunca en SSR.
// Turbopack no puede bundlear Sanity Studio durante el build del servidor.
const NextStudio = dynamic(
  () => import("next-sanity/studio").then((mod) => mod.NextStudio),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-screen text-gray-500">Cargando Studio...</div> }
);

export default function StudioPage() {
  return <NextStudio config={config} />;
}
