// lib/schemas/contact.ts — Schema Zod compartido entre frontend y API.
// Fuente de verdad única. No duplicar en app/api/contact/route.ts ni en app/contacto/.

import { z } from "zod";

export type ContactValidationMessages = {
  nameMin: string;
  nameMax: string;
  companyMax: string;
  emailInvalid: string;
  emailMax: string;
  phoneMin: string;
  phoneMax: string;
  typeRequired: string;
  messageMin: string;
  messageMax: string;
  controlChars: string;
};

// Mensajes por defecto en español — usados en el servidor (API route).
const DEFAULT_MESSAGES: ContactValidationMessages = {
  nameMin: "El nombre debe tener al menos 2 caracteres",
  nameMax: "El nombre no puede superar 80 caracteres",
  companyMax: "La empresa no puede superar 120 caracteres",
  emailInvalid: "Ingresa un email válido",
  emailMax: "El email no puede superar 254 caracteres",
  phoneMin: "El teléfono debe tener al menos 7 dígitos",
  phoneMax: "El teléfono no puede superar 30 caracteres",
  typeRequired: "Selecciona un tipo de consulta",
  messageMin: "El mensaje debe tener al menos 10 caracteres",
  messageMax: "El mensaje no puede superar 1200 caracteres",
  controlChars: "El campo contiene caracteres no permitidos",
};

const NO_SUBJECT_CONTROL_CHARS = /^[^\r\n\u0000-\u001f\u007f]*$/;

export function createContactSchema(msgs: ContactValidationMessages = DEFAULT_MESSAGES) {
  return z.object({
    nombre: z.string().trim()
      .min(2, msgs.nameMin)
      .max(80, msgs.nameMax)
      .regex(NO_SUBJECT_CONTROL_CHARS, msgs.controlChars),
    empresa: z.string().trim()
      .max(120, msgs.companyMax)
      .regex(NO_SUBJECT_CONTROL_CHARS, msgs.controlChars)
      .optional(),
    email: z.string().trim()
      .email(msgs.emailInvalid)
      .max(254, msgs.emailMax),
    telefono: z.string().trim()
      .min(7, msgs.phoneMin)
      .max(30, msgs.phoneMax)
      .regex(NO_SUBJECT_CONTROL_CHARS, msgs.controlChars),
    tipo: z.enum(["pedido", "distribucion", "otro"], {
      message: msgs.typeRequired,
    }),
    mensaje: z.string().trim()
      .min(10, msgs.messageMin)
      .max(1200, msgs.messageMax),
  });
}

// Schema estático para inferir el tipo y para uso en la API route (server-side).
export const contactSchema = createContactSchema();
export type ContactFormData = z.infer<typeof contactSchema>;
