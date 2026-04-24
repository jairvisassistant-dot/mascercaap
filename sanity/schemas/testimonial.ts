import { defineType, defineField } from "sanity";

export const testimonialSchema = defineType({
  name: "testimonial",
  title: "Testimonio",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nombre",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Cargo / Negocio",
      type: "string",
    }),
    defineField({
      name: "text",
      title: "Texto del testimonio",
      type: "text",
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "text_en",
      title: "Texto del testimonio (English)",
      type: "text",
      rows: 4,
      description: "Opcional. Si se completa, se muestra en la versión en inglés del sitio.",
    }),
    defineField({
      name: "role_en",
      title: "Cargo / Negocio (English)",
      type: "string",
      description: "Opcional. Versión en inglés del cargo.",
    }),
    defineField({
      name: "rating",
      title: "Calificación (1 a 5)",
      type: "number",
      options: {
        list: [
          { title: "⭐ 1", value: 1 },
          { title: "⭐⭐ 2", value: 2 },
          { title: "⭐⭐⭐ 3", value: 3 },
          { title: "⭐⭐⭐⭐ 4", value: 4 },
          { title: "⭐⭐⭐⭐⭐ 5", value: 5 },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: 5,
      validation: (Rule) => Rule.required().integer().min(1).max(5),
    }),
  ],

  preview: {
    select: { title: "name", subtitle: "role", rating: "rating" },
    prepare({ title, subtitle, rating }) {
      return {
        title,
        subtitle: `${subtitle ?? ""} · ${"⭐".repeat(rating ?? 5)}`,
      };
    },
  },
});
