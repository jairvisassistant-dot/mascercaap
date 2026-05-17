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

export function createProductPatchSchema(msgs?: { noValidFields?: string }) {
  return z
    .object({
      featured: z.boolean().optional(),
      is_sold_out: z.boolean().optional(),
      is_best_seller: z.boolean().optional(),
      active: z.boolean().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: msgs?.noValidFields ?? "No valid fields to update",
    });
}

export const productPatchSchema = createProductPatchSchema();

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

export const leadUpdateSchema = z.object({
  id: z.string().min(1),
  estado_seguimiento: z.enum(["nuevo", "contactado", "convertido", "perdido"]).optional(),
  notas: z.string().max(2000).optional(),
});

// FAQ schemas
const faqCategoryCreateSchema = z.object({
  _type: z.literal("category"),
  id: z.string().min(1).max(80),
  label_es: z.string().min(1).max(120),
  label_en: z.string().min(1).max(120),
  icon: z.string().max(8).optional(),
});

const faqQuestionCreateSchema = z.object({
  _type: z.literal("question"),
  category_id: z.string().min(1).max(80),
  question_es: z.string().min(1).max(300),
  question_en: z.string().min(1).max(300),
  answer_es: z.string().min(1).max(2000),
  answer_en: z.string().min(1).max(2000),
  keywords: z.array(z.string().max(80)).max(20).optional(),
});

export const faqPostSchema = z.discriminatedUnion("_type", [
  faqCategoryCreateSchema,
  faqQuestionCreateSchema,
]);

export const faqReorderSchema = z.discriminatedUnion("_type", [
  z.object({ _type: z.literal("category"), id: z.string().min(1), direction: z.enum(["up", "down"]) }),
  z.object({ _type: z.literal("question"), id: z.string().min(1), direction: z.enum(["up", "down"]) }),
]);

export const faqPutSchema = z.discriminatedUnion("_type", [
  z.object({
    _type: z.literal("category"),
    id: z.string().min(1),
    label_es: z.string().min(1).max(120).optional(),
    label_en: z.string().min(1).max(120).optional(),
    icon: z.string().max(8).optional(),
  }),
  z.object({
    _type: z.literal("question"),
    id: z.string().min(1),
    question_es: z.string().min(1).max(300).optional(),
    question_en: z.string().min(1).max(300).optional(),
    answer_es: z.string().min(1).max(2000).optional(),
    answer_en: z.string().min(1).max(2000).optional(),
    keywords: z.array(z.string().max(80)).max(20).optional(),
  }),
  z.object({
    _type: z.literal("config"),
    fallback_es: z.string().max(500).optional(),
    fallback_en: z.string().max(500).optional(),
  }),
]);

export const faqDeleteSchema = z.discriminatedUnion("_type", [
  z.object({ _type: z.literal("category"), id: z.string().min(1) }),
  z.object({ _type: z.literal("question"), id: z.string().min(1) }),
]);
