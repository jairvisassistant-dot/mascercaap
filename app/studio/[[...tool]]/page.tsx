import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

// Fuerza renderizado dinámico — el Studio no puede ser estático
export const dynamic = "force-dynamic";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
