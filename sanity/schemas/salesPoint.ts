import { defineType, defineField } from "sanity";

export const salesPointSchema = defineType({
  name: "salesPoint",
  title: "Punto de Venta",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nombre del punto",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "address",
      title: "Dirección",
      type: "string",
    }),
    defineField({
      name: "neighborhood",
      title: "Barrio / Zona",
      type: "string",
    }),
    defineField({
      name: "schedule",
      title: "Horario de atención",
      type: "string",
    }),
    defineField({
      name: "phone",
      title: "Teléfono",
      type: "string",
    }),
  ],

  preview: {
    select: { title: "name", subtitle: "neighborhood" },
  },
});
