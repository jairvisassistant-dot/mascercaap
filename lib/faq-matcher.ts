import type { FAQData, FAQQuestion, FAQCategory } from "@/types";
import type { Locale } from "@/lib/i18n";

type FAQMatch = {
  question: FAQQuestion;
  category: FAQCategory;
  score: number;
};

const STOP_WORDS: Record<Locale, Set<string>> = {
  es: new Set(["de", "la", "el", "los", "las", "un", "una", "y", "o", "que", "como", "cómo", "para", "por", "con", "en", "a", "al", "del", "mi", "me"]),
  en: new Set(["the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "with", "my", "me", "how", "what", "do", "does", "is", "are"]),
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function tokenize(text: string, lang: Locale): string[] {
  const stopWords = STOP_WORDS[lang];
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token));
}

function uniqueTokens(text: string, lang: Locale): string[] {
  return [...new Set(tokenize(text, lang))];
}

function scoreTokenMatches(queryTokens: string[], candidateTokens: string[]): number {
  let score = 0;

  for (const token of queryTokens) {
    if (candidateTokens.includes(token)) {
      score += token.length >= 5 ? 3 : 2;
      continue;
    }

    if (candidateTokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) {
      score += 1;
    }
  }

  return score;
}

function scorePhraseMatches(query: string, phrases: string[]): number {
  let score = 0;

  for (const phrase of phrases) {
    if (!phrase) continue;
    if (phrase.includes(" ") && query.includes(phrase)) {
      score += 4;
    }
  }

  return score;
}

function buildSearchText(question: FAQQuestion, category: FAQCategory, lang: Locale) {
  const localizedQuestion = normalize(question.question[lang]);
  const localizedAnswer = normalize(question.answer[lang]);
  const localizedCategory = normalize(category.label[lang]);
  const normalizedKeywords = question.keywords.map(normalize);

  return {
    localizedQuestion,
    localizedAnswer,
    localizedCategory,
    normalizedKeywords,
    questionTokens: uniqueTokens(question.question[lang], lang),
    answerTokens: uniqueTokens(question.answer[lang], lang),
    categoryTokens: uniqueTokens(category.label[lang], lang),
  };
}

export function findAnswer(query: string, lang: Locale, faqData: FAQData): FAQMatch | null {
  if (!query.trim()) return null;

  const normalizedQuery = normalize(query);
  const queryTokens = uniqueTokens(query, lang);
  const results: FAQMatch[] = [];

  for (const category of faqData.categories) {
    for (const question of category.questions) {
      const search = buildSearchText(question, category, lang);
      let score = 0;

      score += scorePhraseMatches(normalizedQuery, [
        search.localizedQuestion,
        search.localizedCategory,
        ...search.normalizedKeywords,
      ]);

      score += scoreTokenMatches(queryTokens, search.questionTokens);
      score += scoreTokenMatches(queryTokens, search.categoryTokens);
      score += scoreTokenMatches(queryTokens, search.answerTokens) * 0.5;
      score += scoreTokenMatches(queryTokens, search.normalizedKeywords.flatMap((keyword) => keyword.split(/\s+/))) * 1.5;

      if (score > 0) {
        results.push({ question, category, score });
      }
    }
  }

  if (results.length === 0) return null;

  results.sort((a, b) => b.score - a.score);

  const best = results[0];
  if (best.score < 3) return null;

  return best;
}
