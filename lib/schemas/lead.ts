import { z } from "zod";

type LeadValidationMessages = {
  nameMin: string;
  emailInvalid: string;
};

const ES_LEAD_MESSAGES: LeadValidationMessages = {
  nameMin: "El nombre debe tener al menos 2 caracteres",
  emailInvalid: "Ingresa un email válido",
};

const EN_LEAD_MESSAGES: LeadValidationMessages = {
  nameMin: "Name must be at least 2 characters",
  emailInvalid: "Enter a valid email",
};

export function createLeadSchema(msgs: LeadValidationMessages = ES_LEAD_MESSAGES) {
  return z.object({
    nombre: z.string().min(2, msgs.nameMin).max(80),
    email: z.string().email(msgs.emailInvalid).max(254).optional().nullable(),
    tipo: z.enum(["pedido", "negocio", "consulta"]),
    producto_interes: z.string().max(120).optional().nullable(),
    preguntas_bot: z.array(z.string().max(500)).max(20).optional(),
    resumen_handoff: z.string().max(1000).optional(),
  });
}

export { ES_LEAD_MESSAGES, EN_LEAD_MESSAGES };
