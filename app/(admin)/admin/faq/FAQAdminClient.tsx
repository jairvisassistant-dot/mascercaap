"use client";

import { useReducer, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FAQCategoryRow, FAQConfigRow } from "@/types";
import type { CategoryEdit, QuestionEdit, NewCategory, NewQuestion, ConfigForm, Mode } from "./components/types";
import CategoryEditForm from "./components/CategoryEditForm";
import NewCategoryForm from "./components/NewCategoryForm";
import QuestionEditForm from "./components/QuestionEditForm";
import NewQuestionForm from "./components/NewQuestionForm";
import ConfigSection from "./components/ConfigSection";
import ConfirmDeleteBox from "./components/ConfirmDeleteBox";
import FAQCategoryCard from "./components/FAQCategoryCard";
import FAQQuestionItem from "./components/FAQQuestionItem";

// ── Types ────────────────────────────────────────────────────────────────────

type Question = FAQCategoryRow["faq_questions"][number];

type QuestionPatch = {
  question_es: string; question_en: string;
  answer_es: string; answer_en: string;
  keywords: string[];
};

const EMPTY_NEW_CAT: NewCategory = { id: "", label_es: "", label_en: "", icon: "❓" };
const EMPTY_NEW_Q: NewQuestion = { question_es: "", question_en: "", answer_es: "", answer_en: "" };

type State = {
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

type Action =
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

function reducer(state: State, action: Action): State {
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

// ── Componente principal ────────────────────────────────────────

export default function FAQAdminClient({
  initialCategories,
  initialConfig,
}: {
  initialCategories: FAQCategoryRow[];
  initialConfig: FAQConfigRow | null;
}) {
  const { refresh } = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    categories: initialCategories,
    config: initialConfig,
    rowMode: {},
    catEdit: {},
    qEdit: {},
    busy: null,
    moving: null,
    error: "",
    showNewCategory: false,
    newCat: EMPTY_NEW_CAT,
    newQuestionFor: null,
    newQ: EMPTY_NEW_Q,
    editConfig: false,
    configForm: {
      fallback_es: initialConfig?.fallback_es ?? "",
      fallback_en: initialConfig?.fallback_en ?? "",
    },
  });
  const { categories, config, rowMode, catEdit, qEdit, busy, moving, error, showNewCategory, newCat, newQuestionFor, newQ, editConfig, configForm } = state;
  const [, startTransition] = useTransition();

  const anyBusy = busy !== null || moving !== null;

  function getMode(prefix: string, id: string): Mode {
    return rowMode[`${prefix}-${id}`] ?? "view";
  }

  // ── Reordenar categoría ─────────────────────────────────────
  async function moveCat(id: string, direction: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const optimistic = [...categories];
    [optimistic[idx], optimistic[swapIdx]] = [optimistic[swapIdx], optimistic[idx]];
    dispatch({ type: "movingStart", key: `cat-${id}`, optimistic });

    const res = await fetch("/api/admin/faq", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "category", id, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "movingError", original: initialCategories, error: data.error ?? "Error al reordenar" });
    } else {
      dispatch({ type: "movingDone" });
      startTransition(() => refresh());
    }
  }

  // ── Reordenar pregunta ─────────────────────────────────────
  async function moveQ(id: string, direction: "up" | "down") {
    const catIdx = categories.findIndex((c) => (c.faq_questions ?? []).some((q) => q.id === id));
    if (catIdx === -1) return;

    const cat = categories[catIdx];
    const qs = cat.faq_questions ?? [];
    const localIdx = qs.findIndex((q) => q.id === id);
    const swapLocal = direction === "up" ? localIdx - 1 : localIdx + 1;
    if (swapLocal < 0 || swapLocal >= qs.length) return;

    const newQs = [...qs];
    [newQs[localIdx], newQs[swapLocal]] = [newQs[swapLocal], newQs[localIdx]];
    const optimistic = [...categories];
    optimistic[catIdx] = { ...cat, faq_questions: newQs };
    dispatch({ type: "movingStart", key: `q-${id}`, optimistic });

    const res = await fetch("/api/admin/faq", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "question", id, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "movingError", original: initialCategories, error: data.error ?? "Error al reordenar" });
    } else {
      dispatch({ type: "movingDone" });
      startTransition(() => refresh());
    }
  }

  // ── Guardar categoría ──────────────────────────────────────
  async function saveCat(id: string) {
    const vals = catEdit[id];
    if (!vals?.label_es.trim() || !vals?.label_en.trim()) return;
    dispatch({ type: "busyStart", key: `cat-${id}` });

    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _type: "category", id,
        label_es: vals.label_es.trim(),
        label_en: vals.label_en.trim(),
        icon: vals.icon.trim() || "❓",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al guardar" });
    } else {
      dispatch({ type: "catUpdated", id, label_es: vals.label_es.trim(), label_en: vals.label_en.trim(), icon: vals.icon.trim() || "❓" });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ── Guardar pregunta ───────────────────────────────────────
  async function saveQ(id: string) {
    const vals = qEdit[id];
    if (!vals?.question_es.trim() || !vals?.question_en.trim() || !vals?.answer_es.trim() || !vals?.answer_en.trim()) return;
    dispatch({ type: "busyStart", key: `q-${id}` });

    const keywords = vals.keywords.split(",").flatMap((k) => {
      const t = k.trim();
      return t ? [t] : [];
    });

    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _type: "question", id,
        question_es: vals.question_es.trim(),
        question_en: vals.question_en.trim(),
        answer_es: vals.answer_es.trim(),
        answer_en: vals.answer_en.trim(),
        keywords,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al guardar" });
    } else {
      dispatch({ type: "qUpdated", id, patch: {
        question_es: vals.question_es.trim(),
        question_en: vals.question_en.trim(),
        answer_es: vals.answer_es.trim(),
        answer_en: vals.answer_en.trim(),
        keywords,
      }});
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ── Eliminar categoría ─────────────────────────────────────
  async function deleteCat(id: string) {
    dispatch({ type: "busyStart", key: `cat-${id}` });

    const res = await fetch("/api/admin/faq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "category", id }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al eliminar" });
      dispatch({ type: "cancelRow", key: `cat-${id}` });
    } else {
      dispatch({ type: "catDeleted", id });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ── Eliminar pregunta ──────────────────────────────────────
  async function deleteQ(id: string) {
    dispatch({ type: "busyStart", key: `q-${id}` });

    const res = await fetch("/api/admin/faq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "question", id }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al eliminar" });
      dispatch({ type: "cancelRow", key: `q-${id}` });
    } else {
      dispatch({ type: "qDeleted", id });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ── Nueva pregunta ─────────────────────────────────────────
  async function submitNewQuestion() {
    if (!newQuestionFor || !newQ.question_es.trim() || !newQ.question_en.trim() || !newQ.answer_es.trim() || !newQ.answer_en.trim()) return;
    dispatch({ type: "busyStart", key: `newq-${newQuestionFor}` });

    const res = await fetch("/api/admin/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "question", category_id: newQuestionFor, ...newQ }),
    });

    const data = await res.json();
    if (!res.ok) {
      dispatch({ type: "setError", error: data.error ?? "Error al crear pregunta" });
    } else {
      dispatch({ type: "newQSubmitted" });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ── Nueva categoría ────────────────────────────────────────
  async function submitNewCategory() {
    if (!newCat.id.trim() || !newCat.label_es.trim() || !newCat.label_en.trim()) return;
    dispatch({ type: "busyStart", key: "new-category" });

    const res = await fetch("/api/admin/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _type: "category",
        id: newCat.id.trim(),
        label_es: newCat.label_es.trim(),
        label_en: newCat.label_en.trim(),
        icon: newCat.icon.trim() || "❓",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      dispatch({ type: "setError", error: data.error ?? "Error al crear categoría" });
    } else {
      dispatch({ type: "newCatSubmitted" });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ── Guardar config ─────────────────────────────────────────
  async function saveConfig() {
    dispatch({ type: "busyStart", key: "config" });

    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "config", ...configForm }),
    });

    if (!res.ok) {
      const data = await res.json();
      dispatch({ type: "setError", error: data.error ?? "Error al guardar configuración" });
    } else {
      dispatch({ type: "configUpdated", form: configForm });
      startTransition(() => refresh());
    }
    dispatch({ type: "busyDone" });
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="w-full max-w-3xl space-y-8">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* ── Nueva categoría ── */}
      {showNewCategory ? (
        <NewCategoryForm
          busy={busy === "new-category"}
          newCat={newCat}
          onChange={(cat) => dispatch({ type: "setNewCat", cat })}
          onSubmit={submitNewCategory}
          onCancel={() => dispatch({ type: "cancelNewCategory" })}
        />
      ) : (
        <button
          type="button"
          onClick={() => dispatch({ type: "showNewCategoryForm" })}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-mid px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          + Nueva categoría
        </button>
      )}

      {categories.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay categorías FAQ aún. Usa el botón de arriba para crear una.
        </p>
      ) : (
        categories.map((cat, catIdx) => {
          const catMode = getMode("cat", cat.id);
          const questions = cat.faq_questions ?? [];
          const isCatBusy = busy === `cat-${cat.id}` || moving === `cat-${cat.id}`;

          return (
            <div key={cat.id} className="space-y-2">
              {/* ── Card de categoría ── */}
              {catMode === "edit" ? (
                <CategoryEditForm
                  cat={cat}
                  vals={catEdit[cat.id] ?? { label_es: cat.label_es, label_en: cat.label_en, icon: cat.icon }}
                  busy={isCatBusy}
                  onCancel={() => dispatch({ type: "cancelRow", key: `cat-${cat.id}` })}
                  onSave={() => saveCat(cat.id)}
                  onChange={(patch) => dispatch({ type: "catEditChange", id: cat.id, patch })}
                />
              ) : catMode === "confirm-delete" ? (
                <ConfirmDeleteBox
                  title={<>¿Eliminar categoría{" "}<span className="font-bold">{cat.label_es}</span>?</>}
                  subtext="Se marcará como inactiva y no se mostrará en el FAQ público."
                  busy={isCatBusy}
                  onConfirm={() => deleteCat(cat.id)}
                  onCancel={() => dispatch({ type: "cancelRow", key: `cat-${cat.id}` })}
                />
              ) : (
                <>
                  <FAQCategoryCard
                    icon={cat.icon}
                    labelEs={cat.label_es}
                    labelEn={cat.label_en}
                    id={cat.id}
                    active={cat.active}
                    index={catIdx}
                    total={categories.length}
                    isMoving={moving === `cat-${cat.id}`}
                    anyBusy={anyBusy}
                    onMoveUp={() => moveCat(cat.id, "up")}
                    onMoveDown={() => moveCat(cat.id, "down")}
                    onEdit={() => dispatch({ type: "catEditStart", cat })}
                    onDelete={() => dispatch({ type: "setConfirmDelete", key: `cat-${cat.id}` })}
                  />

                  {/* ── Preguntas dentro de la categoría ── */}
                  <div className="ml-8 space-y-1.5 border-l-2 border-border-soft pl-4">
                    {questions.map((q, qIdx) => {
                      const qMode = getMode("q", q.id);
                      const isQBusy = busy === `q-${q.id}` || moving === `q-${q.id}`;

                      if (qMode === "edit") {
                        return (
                          <QuestionEditForm
                            key={q.id}
                            q={q}
                            vals={qEdit[q.id] ?? {
                              question_es: q.question_es,
                              question_en: q.question_en,
                              answer_es: q.answer_es,
                              answer_en: q.answer_en,
                              keywords: (q.keywords ?? []).join(", "),
                            }}
                            busy={isQBusy}
                            onCancel={() => dispatch({ type: "cancelRow", key: `q-${q.id}` })}
                            onSave={() => saveQ(q.id)}
                            onChange={(patch) => dispatch({ type: "qEditChange", id: q.id, patch })}
                          />
                        );
                      }

                      if (qMode === "confirm-delete") {
                        return (
                          <ConfirmDeleteBox
                            key={q.id}
                            title="¿Eliminar esta pregunta?"
                            subtext={q.question_es}
                            busy={isQBusy}
                            onConfirm={() => deleteQ(q.id)}
                            onCancel={() => dispatch({ type: "cancelRow", key: `q-${q.id}` })}
                          />
                        );
                      }

                      return (
                        <FAQQuestionItem
                          key={q.id}
                          questionEs={q.question_es}
                          questionEn={q.question_en}
                          answerEs={q.answer_es}
                          active={q.active}
                          index={qIdx}
                          total={questions.length}
                          isMoving={moving === `q-${q.id}`}
                          anyBusy={anyBusy}
                          onMoveUp={() => moveQ(q.id, "up")}
                          onMoveDown={() => moveQ(q.id, "down")}
                          onEdit={() => dispatch({ type: "qEditStart", q })}
                          onDelete={() => dispatch({ type: "setConfirmDelete", key: `q-${q.id}` })}
                        />
                      );
                    })}

                    {/* ── Botón / Formulario nueva pregunta ── */}
                    {newQuestionFor === cat.id ? (
                      <NewQuestionForm
                        busy={busy === `newq-${cat.id}`}
                        newQ={newQ}
                        onChange={(q) => dispatch({ type: "setNewQ", q })}
                        onSubmit={submitNewQuestion}
                        onCancel={() => dispatch({ type: "cancelNewQuestion" })}
                      />
                    ) : (
                      catMode === "view" && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "showNewQuestion", categoryId: cat.id })}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-mid px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                          + Nueva pregunta
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      {/* ── Config: mensaje de fallback ── */}
      <ConfigSection
        config={config}
        editConfig={editConfig}
        configForm={configForm}
        busy={busy}
        onStartEdit={() => dispatch({ type: "configEditStart" })}
        onCancel={() => dispatch({ type: "configEditCancel" })}
        onChange={(form) => dispatch({ type: "setConfigForm", form })}
        onSave={saveConfig}
      />
    </div>
  );
}
