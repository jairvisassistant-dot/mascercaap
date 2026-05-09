import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";
import { schemaTypes } from "./sanity/schemas";

export default defineConfig({
  name: "mas-cerca-ap-studio",
  title: "Mas Cerca Ap",
  basePath: "/studio",

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title("Contenido")
          .items([
            orderableDocumentListDeskItem({
              type: "product",
              title: "Productos",
              S,
              context,
            }),
            S.documentTypeListItem("testimonial").title("Testimonios"),
            S.documentTypeListItem("salesPoint").title("Puntos de Venta"),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
});
