"use client";

import { AnimatePresence, m } from "framer-motion";
import type { FAQData } from "@/types";
import type { Dictionary, Locale } from "@/lib/i18n";
import EmojiIcon from "@/components/ui/EmojiIcon";

type ChatView = "categories" | "questions";

type Props = {
  t: Dictionary["chatbot"];
  locale: Locale;
  faqData: FAQData;
  chatView: ChatView;
  selectedCategoryId: string | null;
  onCategoryClick: (categoryId: string) => void;
  onQuestionClick: (questionId: string) => void;
  onBackToCategories: () => void;
};

export default function FaqCategoryView({
  t,
  locale,
  faqData,
  chatView,
  selectedCategoryId,
  onCategoryClick,
  onQuestionClick,
  onBackToCategories,
}: Props) {
  const selectedCategory = selectedCategoryId
    ? faqData.categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="px-4 py-3 bg-surface-card border-t border-border-soft">
      <AnimatePresence mode="wait">
        {chatView === "categories" ? (
          <m.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-text-faint mb-2">{t.categories}</p>
            <div className="flex flex-wrap gap-2">
              {faqData.categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => onCategoryClick(cat.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border-mid bg-surface-card text-text-sub hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
                >
                  <EmojiIcon emoji={cat.icon} label={cat.label[locale]} size="sm" tone="neutral" />
                  <span>{cat.label[locale]}</span>
                </button>
              ))}
            </div>
          </m.div>
        ) : (
          <m.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              onClick={onBackToCategories}
              className="text-xs text-primary hover:underline mb-2 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
            >
              ← {t.backToCategories}
            </button>
            <div className="flex flex-col gap-1.5">
              {selectedCategory?.questions.map((q) => (
                <button
                  type="button"
                  key={q.id}
                  onClick={() => onQuestionClick(q.id)}
                  className="text-left text-xs px-3 py-2 rounded-xl border border-border-mid bg-surface-card text-text-sub hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
                >
                  {q.question[locale]}
                </button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
