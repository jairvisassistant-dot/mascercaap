import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const productCreateSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  line: z.string().min(1).max(80),
  presentation: z.string().min(1).max(40),
  presentationOrder: z.number().int().min(1).optional(),
  price: z.number().positive().optional().nullable(),
  image: z.string().url().optional().nullable(),
  description: z.string().min(1).max(300),
  ingredients: z.array(z.string().max(100)).max(30).optional(),
  benefits: z.array(z.string().max(100)).max(30).optional(),
  isSoldOut: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const productUpdateSchema = productCreateSchema.omit({ id: true });

export const productPatchSchema = z
  .object({
    featured: z.boolean().optional(),
    is_sold_out: z.boolean().optional(),
    is_best_seller: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Sin campos válidos para actualizar",
  });

export const reorderSchema = z.object({
  key: z.string().min(1).max(120),
  direction: z.enum(["up", "down"]),
});

export const categoryCreateSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
});

export const categoryUpdateSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
});

export const keyOnlySchema = z.object({
  key: z.string().min(1).max(120),
});

export const lineCreateSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  description: z.string().max(200).optional(),
  gradient: z.string().optional(),
  iconEmoji: z.string().max(4).optional(),
  categoryKey: z.string().nullable().optional(),
});

export const lineUpdateSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  icon_emoji: z.string().max(4).optional(),
  description: z.string().max(200).optional(),
  category_key: z.string().nullable().optional(),
});
