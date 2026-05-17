import "server-only";

import { supabasePublic as supabase } from "@/lib/supabase";
import { faqData as fallbackFAQData } from "@/data/faq";
import type { FAQData, FAQCategoryRow, FAQConfigRow, FAQQuestionRow } from "@/types";

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
    const [{ data: categories, error: categoriesError }, { data: config, error: configError }] = await Promise.all([
      supabase
        .from("faq_categories")
        .select("id, label_es, label_en, icon, display_order, active, faq_questions(id, category_id, question_es, question_en, answer_es, answer_en, keywords, display_order, active)")
        .order("display_order"),
      supabase
        .from("faq_config")
        .select("id, fallback_es, fallback_en")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (categoriesError || configError || !categories?.length) {
      return fallbackFAQData;
    }

    return buildFAQData(categories as FAQCategoryRow[], (config as FAQConfigRow | null) ?? null);
  } catch {
    return fallbackFAQData;
  }
}
