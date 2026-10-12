// State, action types and reducer for the FAQ admin screen.
// Kept in a plain .ts module so FAQAdminClient only exports components.

import type { FAQCategoryRow, FAQConfigRow } from "@/types";
import type { CategoryEdit, QuestionEdit, NewCategory, NewQuestion, ConfigForm, Mode } from "./components/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type Question = FAQCategoryRow["faq_questions"][number];

export type QuestionPatch = {
  question_es: string; question_en: string;
  answer_es: string; answer_en: string;
  keywords: string[];
};

export const EMPTY_NEW_CAT: NewCategory = { id: "", label_es: "", label_en: "", icon: "❓" };
export const EMPTY_NEW_Q: NewQuestion = { question_es: "", question_en: "", answer_es: "", answer_en: "" };

export type State = {
  categories: FAQCategoryRow[];
  config: FAQConfigRow | null;
  rowMode: Record<string, Mode>;
  catEdit: Record<string, CategoryEdit>;
  qEdit: Record<string, QuestionEdit>;
  busy: string | null;
  moving: string | null;
  error: string;
  showNewCategory: boolean;
  newCat: NewCategory;
  newQuestionFor: string | null;
  newQ: NewQuestion;
  editConfig: boolean;
  configForm: ConfigForm;
};

export type Action =
  | { type: "cancelRow"; key: string }
  | { type: "setConfirmDelete"; key: string }
  | { type: "catEditStart"; cat: FAQCategoryRow }
  | { type: "catEditChange"; id: string; patch: Partial<CategoryEdit> }
  | { type: "catUpdated"; id: string; label_es: string; label_en: string; icon: string }
  | { type: "catDeleted"; id: string }
  | { type: "qEditStart"; q: Question }
  | { type: "qEditChange"; id: string; patch: Partial<QuestionEdit> }
  | { type: "qUpdated"; id: string; patch: QuestionPatch }
  | { type: "qDeleted"; id: string }
  | { type: "movingStart"; key: string; optimistic: FAQCategoryRow[] }
  | { type: "movingDone" }
  | { type: "movingError"; original: FAQCategoryRow[]; error: string }
  | { type: "busyStart"; key: string }
  | { type: "busyDone" }
  | { type: "setError"; error: string }
  | { type: "showNewCategoryForm" }
  | { type: "cancelNewCategory" }
  | { type: "setNewCat"; cat: NewCategory }
  | { type: "newCatSubmitted" }
  | { type: "showNewQuestion"; categoryId: string }
  | { type: "cancelNewQuestion" }
  | { type: "setNewQ"; q: NewQuestion }
  | { type: "newQSubmitted" }
  | { type: "configEditStart" }
  | { type: "configEditCancel" }
  | { type: "setConfigForm"; form: ConfigForm }
  | { type: "configUpdated"; form: ConfigForm };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "cancelRow":
      return { ...state, rowMode: { ...state.rowMode, [action.key]: "view" } };
    case "setConfirmDelete":
      return { ...state, rowMode: { ...state.rowMode, [action.key]: "confirm-delete" } };
    case "catEditStart":
      return {
        ...state,
        catEdit: { ...state.catEdit, [action.cat.id]: { label_es: action.cat.label_es, label_en: action.cat.label_en, icon: action.cat.icon } },
        rowMode: { ...state.rowMode, [`cat-${action.cat.id}`]: "edit" },
        error: "",
      };
    case "catEditChange": {
      const prev = state.catEdit[action.id] ?? { label_es: "", label_en: "", icon: "" };
      return { ...state, catEdit: { ...state.catEdit, [action.id]: { ...prev, ...action.patch } } };
    }
    case "catUpdated":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, label_es: action.label_es, label_en: action.label_en, icon: action.icon } : c
        ),
        rowMode: { ...state.rowMode, [`cat-${action.id}`]: "view" },
      };
    case "catDeleted":
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };
    case "qEditStart":
      return {
        ...state,
        qEdit: {
          ...state.qEdit,
          [action.q.id]: {
            question_es: action.q.question_es,
            question_en: action.q.question_en,
            answer_es: action.q.answer_es,
            answer_en: action.q.answer_en,
            keywords: (action.q.keywords ?? []).join(", "),
          },
        },
        rowMode: { ...state.rowMode, [`q-${action.q.id}`]: "edit" },
        error: "",
      };
    case "qEditChange": {
      const prev = state.qEdit[action.id] ?? { question_es: "", question_en: "", answer_es: "", answer_en: "", keywords: "" };
      return { ...state, qEdit: { ...state.qEdit, [action.id]: { ...prev, ...action.patch } } };
    }
    case "qUpdated":
      return {
        ...state,
        categories: state.categories.map((c) => ({
          ...c,
          faq_questions: (c.faq_questions ?? []).map((q) =>
            q.id === action.id ? { ...q, ...action.patch } : q
          ),
        })),
        rowMode: { ...state.rowMode, [`q-${action.id}`]: "view" },
      };
    case "qDeleted":
      return {
        ...state,
        categories: state.categories.map((c) => ({
          ...c,
          faq_questions: (c.faq_questions ?? []).filter((q) => q.id !== action.id),
        })),
      };
    case "movingStart":
      return { ...state, moving: action.key, categories: action.optimistic, error: "" };
    case "movingDone":
      return { ...state, moving: null };
    case "movingError":
      return { ...state, moving: null, categories: action.original, error: action.error };
    case "busyStart":
      return { ...state, busy: action.key, error: "" };
    case "busyDone":
      return { ...state, busy: null };
    case "setError":
      return { ...state, error: action.error };
    case "showNewCategoryForm":
      return { ...state, showNewCategory: true };
    case "cancelNewCategory":
      return { ...state, showNewCategory: false, newCat: EMPTY_NEW_CAT };
    case "setNewCat":
      return { ...state, newCat: action.cat };
    case "newCatSubmitted":
      return { ...state, showNewCategory: false, newCat: EMPTY_NEW_CAT };
    case "showNewQuestion":
      return { ...state, newQuestionFor: action.categoryId, newQ: EMPTY_NEW_Q, error: "" };
    case "cancelNewQuestion":
      return { ...state, newQuestionFor: null };
    case "setNewQ":
      return { ...state, newQ: action.q };
    case "newQSubmitted":
      return { ...state, newQuestionFor: null };
    case "configEditStart":
      return {
        ...state,
        editConfig: true,
        configForm: {
          fallback_es: state.config?.fallback_es ?? "",
          fallback_en: state.config?.fallback_en ?? "",
        },
      };
    case "configEditCancel":
      return { ...state, editConfig: false };
    case "setConfigForm":
      return { ...state, configForm: action.form };
    case "configUpdated":
      return {
        ...state,
        config: state.config
          ? { ...state.config, fallback_es: action.form.fallback_es, fallback_en: action.form.fallback_en }
          : { id: 1, fallback_es: action.form.fallback_es, fallback_en: action.form.fallback_en },
        editConfig: false,
      };
    default:
      return state;
  }
}
