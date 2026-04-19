// lib/schemas/contact.ts — Schema Zod compartido entre frontend y API.
// Fuente de verdad única. No duplicar en app/api/contact/route.ts ni en app/contacto/.

import { z } from "zod";

export type ContactValidationMessages = {
  nameMin: string;
  emailInvalid: string;
  phoneMin: string;
  typeRequired: string;
  messageMin: string;
};

// Mensajes por defecto en español — usados en el servidor (API route).
const DEFAULT_MESSAGES: ContactValidationMessages = {
  nameMin: "El nombre debe tener al menos 2 caracteres",
  emailInvalid: "Ingresa un email válido",
  phoneMin: "El teléfono debe tener al menos 7 dígitos",
  typeRequired: "Selecciona un tipo de consulta",
  messageMin: "El mensaje debe tener al menos 10 caracteres",
};

export function createContactSchema(msgs: ContactValidationMessages = DEFAULT_MESSAGES) {
  return z.object({
    nombre:   z.string().min(2,  msgs.nameMin),
    empresa:  z.string().optional(),
    email:    z.string().email(msgs.emailInvalid),
    telefono: z.string().min(7,  msgs.phoneMin),
    tipo: z.enum(["pedido", "distribucion", "otro"], {
      message: msgs.typeRequired,
    }),
    mensaje: z.string().min(10, msgs.messageMin),
  });
}

// Schema estático para inferir el tipo y para uso en la API route (server-side).
export const contactSchema = createContactSchema();
export type ContactFormData = z.infer<typeof contactSchema>;
