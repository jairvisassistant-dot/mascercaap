import { z } from "zod"

export const orderItemSchema = z.object({
  productType:  z.string().min(1).max(60),
  fruit:        z.string().min(1).max(60),
  presentation: z.string().min(1).max(20).nullable(),
  quantity:     z.number().int().min(1).max(9999),
})

export const orderSchema = z.object({
  nombre:          z.string().min(2).max(80),
  email:           z.string().email().max(254).optional().nullable(),
  whatsapp_number: z
    .string()
    .regex(/^[+\d\s\-(). ]{7,20}$/)
    .optional()
    .nullable(),
  consentAccepted: z.literal(true),
  profile:         z.enum(["hogar", "cafeteria", "evento", "distribucion"]),
  items:           z.array(orderItemSchema).min(1).max(20),
}).refine(
  (data) => Boolean(data.email) || Boolean(data.whatsapp_number),
  { message: "Se requiere email o número de WhatsApp", path: ["email"] }
)

export type OrderItem  = z.infer<typeof orderItemSchema>
export type OrderInput = z.infer<typeof orderSchema>
