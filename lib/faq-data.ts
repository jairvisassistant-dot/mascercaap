import "server-only";

import { supabasePublic as supabase } from "@/lib/supabase";
import { faqData as fallbackFAQData } from "@/data/faq";
import type { FAQData, FAQCategoryRow, FAQConfigRow, FAQQuestionRow } from "@/types";

type ProductRow = { name: string; line: string; presentation: string };

const LINE_LABELS: Record<string, { es: string; en: string }> = {
  jugos: { es: "jugos naturales", en: "natural juices" },
  pulpas: { es: "pulpas congeladas", en: "frozen pulps" },
  lacteos: { es: "lácteos", en: "dairy products" },
};

function buildProductAnswers(products: ProductRow[]) {
  const lineNames = new Map<string, string[]>();
  const linePres = new Map<string, string[]>();

  for (const p of products) {
    if (!lineNames.has(p.line)) {
      lineNames.set(p.line, []);
      linePres.set(p.line, []);
    }
    const names = lineNames.get(p.line)!;
    if (!names.includes(p.name)) names.push(p.name);
    const pres = linePres.get(p.line)!;
    if (!pres.includes(p.presentation)) pres.push(p.presentation);
  }

  const catalogParts: { es: string[]; en: string[] } = { es: [], en: [] };
  const sizesParts: { es: string[]; en: string[] } = { es: [], en: [] };

  for (const [line, names] of lineNames) {
    const labels = LINE_LABELS[line];
    if (!labels) continue;
    catalogParts.es.push(`${labels.es}: ${names.join(", ")}`);
    catalogParts.en.push(`${labels.en}: ${names.join(", ")}`);
    const pres = linePres.get(line)!;
    sizesParts.es.push(`${labels.es} en ${pres.join(", ")}`);
    sizesParts.en.push(`${labels.en} in ${pres.join(", ")}`);
  }

  return {
    catalogES: `Ofrecemos ${catalogParts.es.join("; ")}.`,
    catalogEN: `We offer ${catalogParts.en.join("; ")}.`,
    sizesES: `Presentaciones disponibles: ${sizesParts.es.join("; ")}.`,
    sizesEN: `Available presentations: ${sizesParts.en.join("; ")}.`,
  };
}

function enrichFAQWithProducts(
  data: FAQData,
  answers: { catalogES: string; catalogEN: string; sizesES: string; sizesEN: string }
): FAQData {
  return {
    ...data,
    categories: data.categories.map((cat) => ({
      ...cat,
      questions: cat.questions.map((q) => {
        if (q.keywords.includes("catalogo"))
          return { ...q, answer: { es: answers.catalogES, en: answers.catalogEN } };
        if (q.keywords.includes("tamanios"))
          return { ...q, answer: { es: answers.sizesES, en: answers.sizesEN } };
        return q;
      }),
    })),
  };
}

function mapQuestion(row: FAQQuestionRow) {
  return {
    id: row.id,
    question: {
      es: row.question_es,
      en: row.question_en,
    },
    answer: {
      es: row.answer_es,
      en: row.answer_en,
    },
    keywords: row.keywords ?? [],
  };
}

function mapCategory(row: FAQCategoryRow) {
  const questions = [...(row.faq_questions ?? [])]
    .filter((question) => question.active)
    .sort((a, b) => a.display_order - b.display_order)
    .map(mapQuestion);

  return {
    id: row.id,
    label: {
      es: row.label_es,
      en: row.label_en,
    },
    icon: row.icon,
    questions,
  };
}

function buildFAQData(categories: FAQCategoryRow[], config: FAQConfigRow | null): FAQData {
  return {
    categories: categories
      .filter((category) => category.active)
      .sort((a, b) => a.display_order - b.display_order)
      .map(mapCategory),
    fallback: {
      es: config?.fallback_es ?? fallbackFAQData.fallback.es,
      en: config?.fallback_en ?? fallbackFAQData.fallback.en,
    },
  };
}

export async function getFAQData(): Promise<FAQData> {
  if (!supabase) return fallbackFAQData;

  try {
    const [
      { data: categories, error: categoriesError },
      { data: config, error: configError },
      { data: productRows },
    ] = await Promise.all([
      supabase
        .from("faq_categories")
        .select("id, label_es, label_en, icon, display_order, active, faq_questions(id, category_id, question_es, question_en, answer_es, answer_en, keywords, display_order, active)")
        .order("display_order"),
      supabase
        .from("faq_config")
        .select("id, fallback_es, fallback_en")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("products")
        .select("name, line, presentation")
        .eq("active", true)
        .order("presentation_order"),
    ]);

    if (categoriesError || configError || !categories?.length) {
      return fallbackFAQData;
    }

    const faqData = buildFAQData(categories as FAQCategoryRow[], (config as FAQConfigRow | null) ?? null);

    if (productRows?.length) {
      const answers = buildProductAnswers(productRows as ProductRow[]);
      return enrichFAQWithProducts(faqData, answers);
    }

    return faqData;
  } catch {
    return fallbackFAQData;
  }
}
