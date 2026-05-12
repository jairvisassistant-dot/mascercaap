import { z } from "zod";

export function createLeadSchema() {
  return z.object({
    nombre: z.string().min(2).max(80),
    email: z.string().email().max(254).optional().nullable(),
    tipo: z.enum(["pedido", "negocio", "consulta"]),
    producto_interes: z.string().max(120).optional().nullable(),
    preguntas_bot: z.array(z.string().max(500)).max(20).optional(),
  });
}

export const leadSchema = createLeadSchema();

export type LeadInput = z.infer<ReturnType<typeof createLeadSchema>>;
