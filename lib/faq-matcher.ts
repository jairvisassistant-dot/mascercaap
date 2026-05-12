import { faqData } from "@/data/faq";
import type { FAQQuestion, FAQCategory } from "@/types";

type FAQMatch = {
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

export function findAnswer(query: string): FAQMatch | null {
  if (!query.trim()) return null;

  const queryTokens = tokenize(query);
  const results: FAQMatch[] = [];

  for (const category of faqData.categories) {
    for (const question of category.questions) {
      let score = 0;
      const normalizedKeywords = question.keywords.map(normalize);
      const keywordSet = new Set(normalizedKeywords);

      for (const token of queryTokens) {
        if (keywordSet.has(token)) {
          score += 2;
        } else {
          for (const nk of normalizedKeywords) {
            if (nk.includes(token) || token.includes(nk)) {
              score += 1;
            }
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

