// lib/schemas/contact.ts — Schema Zod compartido entre frontend y API.
// Fuente de verdad única. No duplicar en app/api/contact/route.ts ni en app/contacto/.

import { z } from "zod";

export const contactSchema = z.object({
  nombre:  z.string().min(2,  "El nombre debe tener al menos 2 caracteres"),
  empresa: z.string().optional(),
  email:   z.string().email("Ingresa un email válido"),
  telefono: z.string().min(7, "El teléfono debe tener al menos 7 dígitos"),
  tipo: z.enum(["pedido", "distribucion", "otro"], {
    message: "Selecciona un tipo de consulta",
  }),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
