"use client";

import { useState, useTransition } from "react";
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

// ── Componente principal ────────────────────────────────────────

export default function FAQAdminClient({
  initialCategories,
  initialConfig,
}: {
  initialCategories: FAQCategoryRow[];
  initialConfig: FAQConfigRow | null;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [config, setConfig] = useState(initialConfig);
  const [rowMode, setRowMode] = useState<Record<string, Mode>>({});
  const [catEdit, setCatEdit] = useState<Record<string, CategoryEdit>>({});
  const [qEdit, setQEdit] = useState<Record<string, QuestionEdit>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // Formulario de nueva categoría
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCat, setNewCat] = useState<NewCategory>({
    id: "", label_es: "", label_en: "", icon: "❓",
  });

  // Formulario de nueva pregunta
  const [newQuestionFor, setNewQuestionFor] = useState<string | null>(null);
  const [newQ, setNewQ] = useState<NewQuestion>({
    question_es: "", question_en: "", answer_es: "", answer_en: "",
  });

  // Edición de config
  const [editConfig, setEditConfig] = useState(false);
  const [configForm, setConfigForm] = useState<ConfigForm>({
    fallback_es: initialConfig?.fallback_es ?? "",
    fallback_en: initialConfig?.fallback_en ?? "",
  });

  const anyBusy = busy !== null || moving !== null;

  function getMode(prefix: string, id: string): Mode {
    return rowMode[`${prefix}-${id}`] ?? "view";
  }

  function cancelRow(key: string) {
    setRowMode((prev) => ({ ...prev, [key]: "view" }));
  }

  // ── Category: empezar edición ───────────────────────────────
  function startCatEdit(cat: FAQCategoryRow) {
    setCatEdit((prev) => ({
      ...prev,
      [cat.id]: { label_es: cat.label_es, label_en: cat.label_en, icon: cat.icon },
    }));
    setRowMode((prev) => ({ ...prev, [`cat-${cat.id}`]: "edit" }));
    setError("");
  }

  // ── Question: empezar edición ──────────────────────────────
  function startQEdit(q: FAQCategoryRow["faq_questions"][number]) {
    setQEdit((prev) => ({
      ...prev,
      [q.id]: {
        question_es: q.question_es,
        question_en: q.question_en,
        answer_es: q.answer_es,
        answer_en: q.answer_en,
        keywords: (q.keywords ?? []).join(", "),
      },
    }));
    setRowMode((prev) => ({ ...prev, [`q-${q.id}`]: "edit" }));
    setError("");
  }

  // ── Reordenar categoría ─────────────────────────────────────
  async function moveCat(id: string, direction: "up" | "down") {
    setMoving(`cat-${id}`);
    setError("");

    const idx = categories.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) { setMoving(null); return; }

    const next = [...categories];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setCategories(next);

    const res = await fetch("/api/admin/faq", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "category", id, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al reordenar");
      setCategories(initialCategories);
    } else {
      startTransition(() => router.refresh());
    }
    setMoving(null);
  }

  // ── Reordenar pregunta ─────────────────────────────────────
  async function moveQ(id: string, direction: "up" | "down") {
    setMoving(`q-${id}`);
    setError("");

    // Encontrar la categoría que contiene esta pregunta
    const catIdx = categories.findIndex((c) =>
      (c.faq_questions ?? []).some((q) => q.id === id)
    );
    if (catIdx === -1) { setMoving(null); return; }

    const cat = categories[catIdx];
    const qs = cat.faq_questions ?? [];
    const localIdx = qs.findIndex((q) => q.id === id);
    const swapLocal = direction === "up" ? localIdx - 1 : localIdx + 1;
    if (swapLocal < 0 || swapLocal >= qs.length) { setMoving(null); return; }

    // Optimistic update
    const newQs = [...qs];
    [newQs[localIdx], newQs[swapLocal]] = [newQs[swapLocal], newQs[localIdx]];
    const next = [...categories];
    next[catIdx] = { ...cat, faq_questions: newQs };
    setCategories(next);

    const res = await fetch("/api/admin/faq", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "question", id, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al reordenar");
      setCategories(initialCategories);
    } else {
      startTransition(() => router.refresh());
    }
    setMoving(null);
  }

  // ── Guardar categoría ──────────────────────────────────────
  async function saveCat(id: string) {
    const vals = catEdit[id];
    if (!vals?.label_es.trim() || !vals?.label_en.trim()) return;
    setBusy(`cat-${id}`);
    setError("");

    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _type: "category",
        id,
        label_es: vals.label_es.trim(),
        label_en: vals.label_en.trim(),
        icon: vals.icon.trim() || "❓",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
    } else {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                label_es: vals.label_es.trim(),
                label_en: vals.label_en.trim(),
                icon: vals.icon.trim() || "❓",
              }
            : c
        )
      );
      setRowMode((prev) => ({ ...prev, [`cat-${id}`]: "view" }));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // ── Guardar pregunta ───────────────────────────────────────
  async function saveQ(id: string) {
    const vals = qEdit[id];
    if (
      !vals?.question_es.trim() ||
      !vals?.question_en.trim() ||
      !vals?.answer_es.trim() ||
      !vals?.answer_en.trim()
    )
      return;
    setBusy(`q-${id}`);
    setError("");

    const keywords = vals.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _type: "question",
        id,
        question_es: vals.question_es.trim(),
        question_en: vals.question_en.trim(),
        answer_es: vals.answer_es.trim(),
        answer_en: vals.answer_en.trim(),
        keywords,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
    } else {
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          faq_questions: (c.faq_questions ?? []).map((q) =>
            q.id === id
              ? {
                  ...q,
                  question_es: vals.question_es.trim(),
                  question_en: vals.question_en.trim(),
                  answer_es: vals.answer_es.trim(),
                  answer_en: vals.answer_en.trim(),
                  keywords,
                }
              : q
          ),
        }))
      );
      setRowMode((prev) => ({ ...prev, [`q-${id}`]: "view" }));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // ── Eliminar categoría (soft) ──────────────────────────────
  async function deleteCat(id: string) {
    setBusy(`cat-${id}`);
    setError("");

    const res = await fetch("/api/admin/faq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "category", id }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al eliminar");
      setRowMode((prev) => ({ ...prev, [`cat-${id}`]: "view" }));
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // ── Eliminar pregunta (soft) ───────────────────────────────
  async function deleteQ(id: string) {
    setBusy(`q-${id}`);
    setError("");

    const res = await fetch("/api/admin/faq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "question", id }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al eliminar");
      setRowMode((prev) => ({ ...prev, [`q-${id}`]: "view" }));
    } else {
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          faq_questions: (c.faq_questions ?? []).filter((q) => q.id !== id),
        }))
      );
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // ── Nueva pregunta ─────────────────────────────────────────
  function startNewQuestion(categoryId: string) {
    setNewQuestionFor(categoryId);
    setNewQ({ question_es: "", question_en: "", answer_es: "", answer_en: "" });
    setError("");
  }

  async function submitNewQuestion() {
    if (
      !newQuestionFor ||
      !newQ.question_es.trim() ||
      !newQ.question_en.trim() ||
      !newQ.answer_es.trim() ||
      !newQ.answer_en.trim()
    )
      return;
    setBusy(`newq-${newQuestionFor}`);
    setError("");

    const res = await fetch("/api/admin/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "question", category_id: newQuestionFor, ...newQ }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear pregunta");
    } else {
      setNewQuestionFor(null);
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // ── Nueva categoría ────────────────────────────────────────
  async function submitNewCategory() {
    if (!newCat.id.trim() || !newCat.label_es.trim() || !newCat.label_en.trim()) return;
    setBusy("new-category");
    setError("");

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
      setError(data.error ?? "Error al crear categoría");
    } else {
      setShowNewCategory(false);
      setNewCat({ id: "", label_es: "", label_en: "", icon: "❓" });
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // ── Guardar config ─────────────────────────────────────────
  async function saveConfig() {
    setBusy("config");
    setError("");

    const res = await fetch("/api/admin/faq", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _type: "config", ...configForm }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar configuración");
    } else {
      setConfig((prev) =>
        prev
          ? { ...prev, fallback_es: configForm.fallback_es, fallback_en: configForm.fallback_en }
          : { id: 1, ...configForm }
      );
      setEditConfig(false);
      startTransition(() => router.refresh());
    }
    setBusy(null);
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
          onChange={setNewCat}
          onSubmit={submitNewCategory}
          onCancel={() => {
            setShowNewCategory(false);
            setNewCat({ id: "", label_es: "", label_en: "", icon: "❓" });
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
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
                  vals={
                    catEdit[cat.id] ?? {
                      label_es: cat.label_es,
                      label_en: cat.label_en,
                      icon: cat.icon,
                    }
                  }
                  busy={isCatBusy}
                  onCancel={() => cancelRow(`cat-${cat.id}`)}
                  onSave={() => saveCat(cat.id)}
                  onChange={(patch) =>
                    setCatEdit((prev) => ({
                      ...prev,
                      [cat.id]: { ...(prev[cat.id] ?? catEdit[cat.id]), ...patch },
                    }))
                  }
                />
                ) : catMode === "confirm-delete" ? (
                <ConfirmDeleteBox
                  title={
                    <>
                      ¿Eliminar categoría{" "}
                      <span className="font-bold">{cat.label_es}</span>?
                    </>
                  }
                  subtext="Se marcará como inactiva y no se mostrará en el FAQ público."
                  busy={isCatBusy}
                  onConfirm={() => deleteCat(cat.id)}
                  onCancel={() => cancelRow(`cat-${cat.id}`)}
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
                    onEdit={() => startCatEdit(cat)}
                    onDelete={() =>
                      setRowMode((prev) => ({
                        ...prev,
                        [`cat-${cat.id}`]: "confirm-delete",
                      }))
                    }
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
                            vals={
                              qEdit[q.id] ?? {
                                question_es: q.question_es,
                                question_en: q.question_en,
                                answer_es: q.answer_es,
                                answer_en: q.answer_en,
                                keywords: (q.keywords ?? []).join(", "),
                              }
                            }
                            busy={isQBusy}
                            onCancel={() => cancelRow(`q-${q.id}`)}
                            onSave={() => saveQ(q.id)}
                            onChange={(patch) =>
                              setQEdit((prev) => ({
                                ...prev,
                                [q.id]: { ...(prev[q.id] ?? qEdit[q.id]), ...patch },
                              }))
                            }
                          />
                        );
                      }

                      if (qMode === "confirm-delete") {
                        return (
                          <ConfirmDeleteBox
                            key={q.id}
                            title="¿Eliminar esta pregunta?"
                            subtext={<span className="line-clamp-1">{q.question_es}</span>}
                            busy={isQBusy}
                            onConfirm={() => deleteQ(q.id)}
                            onCancel={() => cancelRow(`q-${q.id}`)}
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
                          onEdit={() => startQEdit(q)}
                          onDelete={() =>
                            setRowMode((prev) => ({
                              ...prev,
                              [`q-${q.id}`]: "confirm-delete",
                            }))
                          }
                        />
                      );
                    })}

                    {/* ── Botón / Formulario nueva pregunta ── */}
                    {newQuestionFor === cat.id ? (
                      <NewQuestionForm
                        busy={busy === `newq-${cat.id}`}
                        newQ={newQ}
                        onChange={setNewQ}
                        onSubmit={submitNewQuestion}
                        onCancel={() => setNewQuestionFor(null)}
                      />
                    ) : (
                      catMode === "view" && (
                        <button
                          type="button"
                          onClick={() => startNewQuestion(cat.id)}
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
        onStartEdit={() => {
          setConfigForm({
            fallback_es: config?.fallback_es ?? "",
            fallback_en: config?.fallback_en ?? "",
          });
          setEditConfig(true);
        }}
        onCancel={() => setEditConfig(false)}
        onChange={setConfigForm}
        onSave={saveConfig}
      />
    </div>
  );
}


