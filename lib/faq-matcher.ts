import { faqData } from "@/data/faq";
import type { FAQQuestion, FAQCategory } from "@/types";
import type { Locale } from "@/lib/i18n";

export type FAQMatch = {
  question: FAQQuestion;
  category: FAQCategory;
  score: number;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

export function findAnswer(query: string, _lang: Locale): FAQMatch | null {
  if (!query.trim()) return null;

  const queryTokens = tokenize(query);
  const results: FAQMatch[] = [];

  for (const category of faqData.categories) {
    for (const question of category.questions) {
      let score = 0;

      for (const token of queryTokens) {
        for (const keyword of question.keywords) {
          const normalizedKeyword = normalize(keyword);
          if (normalizedKeyword === token) {
            score += 2;
          } else if (normalizedKeyword.includes(token) || token.includes(normalizedKeyword)) {
            score += 1;
          }
        }
      }

      if (score > 0) {
        results.push({ question, category, score });
      }
    }
  }

  if (results.length === 0) return null;

  results.sort((a, b) => b.score - a.score);

  const best = results[0];
  if (best.score < 2) return null;

  return best;
}

