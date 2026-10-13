"use client";

import { useTransition } from "react";
import type { Dispatch } from "react";
import { useRouter } from "next/navigation";
import type { FAQCategoryRow } from "@/types";
import type { Action, State } from "./faq-admin-state";

// All async mutations for the FAQ admin screen, extracted from FAQAdminClient
// so the component stays small. Every handler reads the state closure it was
// created with, exactly as before the extraction.

export function useFaqAdminActions({
  state,
  dispatch,
  initialCategories,
}: {
  state: State;
  dispatch: Dispatch<Action>;
  initialCategories: FAQCategoryRow[];
}) {
  const { refresh } = useRouter();
  const [, startTransition] = useTransition();
  const { categories, catEdit, qEdit, newQuestionFor, newQ, newCat, configForm } = state;

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

  return {
    moveCat,
    moveQ,
    saveCat,
    saveQ,
    deleteCat,
    deleteQ,
    submitNewQuestion,
    submitNewCategory,
    saveConfig,
  };
}
