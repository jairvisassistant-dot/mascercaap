import { defineType, defineField } from "sanity";
import {
  orderRankField,
  orderRankOrdering,
} from "@sanity/orderable-document-list";

export const productSchema = defineType({
  name: "product",
  title: "Producto",
  type: "document",
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: "product" }),

    defineField({
      name: "id",
      title: "ID único",
      type: "slug",
      description: 'Ej: "limon-600". Se usa como identificador en el código.',
      options: { source: "name", maxLength: 60 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "name",
      title: "Nombre del producto",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "line",
      title: "Línea",
      type: "string",
      options: {
        list: [
          { title: "Zumo de Limón", value: "limon" },
          { title: "Zumo de Limonada con Cereza", value: "limonada-cereza" },
          { title: "Zumo de Limonada con Coco", value: "limonada-coco" },
          { title: "Zumo de Maracuyá", value: "maracuya" },
          { title: "Pulpas de Frutas", value: "pulpas" },
          { title: "Kumiss", value: "kumiss" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "presentation",
      title: "Presentación",
      type: "string",
      description: 'Ej: "350ml", "1L", "2L", "5L", "250g", "Próximamente"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "presentationOrder",
      title: "Orden dentro de la línea",
      type: "number",
      description: "Número para ordenar de menor a mayor (0, 1, 2, 3...)",
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: "price",
      title: "Precio (COP)",
      type: "number",
      description: "Opcional. Dejar vacío si no se muestra precio.",
    }),
    defineField({
      name: "image",
      title: "Imagen",
      type: "image",
      options: { hotspot: true },
      description: "Imagen principal del producto.",
    }),
    defineField({
      name: "description",
      title: "Descripción corta",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().max(300),
    }),
    defineField({
      name: "ingredients",
      title: "Ingredientes",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "benefits",
      title: "Beneficios",
      type: "array",
      of: [{ type: "string" }],
    }),

    // ── CAMPOS DE ESTADO ──
    defineField({
      name: "isSoldOut",
      title: "Agotado",
      type: "boolean",
      description: "Muestra badge rojo AGOTADO sobre la imagen del producto.",
      initialValue: false,
    }),
    defineField({
      name: "isBestSeller",
      title: "Más Vendido",
      type: "boolean",
      description: "Muestra badge naranja MÁS VENDIDO en la tarjeta.",
      initialValue: false,
    }),
    defineField({
      name: "featured",
      title: "Destacado",
      type: "boolean",
      description:
        'Aparece en la sección "Productos Destacados" de la página de inicio.',
      initialValue: false,
    }),
  ],

  preview: {
    select: {
      title: "name",
      subtitle: "presentation",
      media: "image",
      isSoldOut: "isSoldOut",
      isBestSeller: "isBestSeller",
    },
    prepare({ title, subtitle, media, isSoldOut, isBestSeller }) {
      const badges = [isSoldOut ? "AGOTADO" : null, isBestSeller ? "⭐ MÁS VENDIDO" : null]
        .filter(Boolean)
        .join(" · ");
      return {
        title: `${title} ${subtitle ?? ""}`.trim(),
        subtitle: badges || undefined,
        media,
      };
    },
  },
});
