// ── Tipos locales compartidos entre FAQAdminClient y sus sub-componentes ──

export type CategoryEdit = { label_es: string; label_en: string; icon: string };

export type QuestionEdit = {
  question_es: string;
  question_en: string;
  answer_es: string;
  answer_en: string;
  keywords: string;
};

export type NewQuestion = {
  question_es: string;
  question_en: string;
  answer_es: string;
  answer_en: string;
};

export type ConfigForm = { fallback_es: string; fallback_en: string };

export type Mode = "view" | "edit" | "confirm-delete";
