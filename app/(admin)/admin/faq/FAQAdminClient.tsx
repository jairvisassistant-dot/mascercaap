"use client";

import { useReducer } from "react";
import type { FAQCategoryRow, FAQConfigRow } from "@/types";
import type { Mode } from "./components/types";
import NewCategoryForm from "./components/NewCategoryForm";
import ConfigSection from "./components/ConfigSection";
import FAQCategorySection from "./components/FAQCategorySection";
import { EMPTY_NEW_CAT, EMPTY_NEW_Q, reducer } from "./faq-admin-state";
import { useFaqAdminActions } from "./use-faq-admin-actions";

// ── Componente principal ────────────────────────────────────────

export default function FAQAdminClient({
  initialCategories,
  initialConfig,
}: {
  initialCategories: FAQCategoryRow[];
  initialConfig: FAQConfigRow | null;
}) {
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

  const anyBusy = busy !== null || moving !== null;

  function getMode(prefix: string, id: string): Mode {
    return rowMode[`${prefix}-${id}`] ?? "view";
  }

  const { moveCat, moveQ, saveCat, saveQ, deleteCat, deleteQ, submitNewQuestion, submitNewCategory, saveConfig } =
    useFaqAdminActions({ state, dispatch, initialCategories });

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="w-full max-w-3xl space-y-8">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* New category toggle */}
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
        categories.map((cat, catIdx) => (
          <FAQCategorySection
            key={cat.id}
            cat={cat}
            catIdx={catIdx}
            total={categories.length}
            catMode={getMode("cat", cat.id)}
            catEdit={catEdit}
            qEdit={qEdit}
            newQuestionFor={newQuestionFor}
            newQ={newQ}
            busy={busy}
            moving={moving}
            anyBusy={anyBusy}
            getMode={getMode}
            onMoveCat={moveCat}
            onMoveQ={moveQ}
            onCatEditStart={(c) => dispatch({ type: "catEditStart", cat: c })}
            onCatEditChange={(id, patch) => dispatch({ type: "catEditChange", id, patch })}
            onSaveCat={saveCat}
            onDeleteCat={deleteCat}
            onCancelRow={(key) => dispatch({ type: "cancelRow", key })}
            onSetConfirmDelete={(key) => dispatch({ type: "setConfirmDelete", key })}
            onQEditStart={(q) => dispatch({ type: "qEditStart", q })}
            onQEditChange={(id, patch) => dispatch({ type: "qEditChange", id, patch })}
            onSaveQ={saveQ}
            onDeleteQ={deleteQ}
            onShowNewQuestion={(categoryId) => dispatch({ type: "showNewQuestion", categoryId })}
            onCancelNewQuestion={() => dispatch({ type: "cancelNewQuestion" })}
            onSetNewQ={(q) => dispatch({ type: "setNewQ", q })}
            onSubmitNewQuestion={submitNewQuestion}
          />
        ))
      )}

      {/* Config: fallback message */}
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
