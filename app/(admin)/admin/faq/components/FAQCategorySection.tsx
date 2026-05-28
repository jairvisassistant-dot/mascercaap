"use client";

import type { FAQCategoryRow } from "@/types";
import type { CategoryEdit, QuestionEdit, NewQuestion, Mode } from "./types";
import CategoryEditForm from "./CategoryEditForm";
import ConfirmDeleteBox from "./ConfirmDeleteBox";
import FAQCategoryCard from "./FAQCategoryCard";
import FAQQuestionList from "./FAQQuestionList";

type Question = FAQCategoryRow["faq_questions"][number];

interface FAQCategorySectionProps {
  cat: FAQCategoryRow;
  catIdx: number;
  total: number;
  catMode: Mode;
  catEdit: Record<string, CategoryEdit>;
  qEdit: Record<string, QuestionEdit>;
  newQuestionFor: string | null;
  newQ: NewQuestion;
  busy: string | null;
  moving: string | null;
  anyBusy: boolean;
  getMode: (prefix: string, id: string) => Mode;
  onMoveCat: (id: string, direction: "up" | "down") => void;
  onMoveQ: (id: string, direction: "up" | "down") => void;
  onCatEditStart: (cat: FAQCategoryRow) => void;
  onCatEditChange: (id: string, patch: Partial<CategoryEdit>) => void;
  onSaveCat: (id: string) => void;
  onDeleteCat: (id: string) => void;
  onCancelRow: (key: string) => void;
  onSetConfirmDelete: (key: string) => void;
  onQEditStart: (q: Question) => void;
  onQEditChange: (id: string, patch: Partial<QuestionEdit>) => void;
  onSaveQ: (id: string) => void;
  onDeleteQ: (id: string) => void;
  onShowNewQuestion: (categoryId: string) => void;
  onCancelNewQuestion: () => void;
  onSetNewQ: (q: NewQuestion) => void;
  onSubmitNewQuestion: () => void;
}

export default function FAQCategorySection({
  cat,
  catIdx,
  total,
  catMode,
  catEdit,
  qEdit,
  newQuestionFor,
  newQ,
  busy,
  moving,
  anyBusy,
  getMode,
  onMoveCat,
  onMoveQ,
  onCatEditStart,
  onCatEditChange,
  onSaveCat,
  onDeleteCat,
  onCancelRow,
  onSetConfirmDelete,
  onQEditStart,
  onQEditChange,
  onSaveQ,
  onDeleteQ,
  onShowNewQuestion,
  onCancelNewQuestion,
  onSetNewQ,
  onSubmitNewQuestion,
}: FAQCategorySectionProps) {
  const questions = cat.faq_questions ?? [];
  const isCatBusy = busy === `cat-${cat.id}` || moving === `cat-${cat.id}`;

  return (
    <div className="space-y-2">
      {catMode === "edit" ? (
        <CategoryEditForm
          cat={cat}
          vals={catEdit[cat.id] ?? { label_es: cat.label_es, label_en: cat.label_en, icon: cat.icon }}
          busy={isCatBusy}
          onCancel={() => onCancelRow(`cat-${cat.id}`)}
          onSave={() => onSaveCat(cat.id)}
          onChange={(patch) => onCatEditChange(cat.id, patch)}
        />
      ) : catMode === "confirm-delete" ? (
        <ConfirmDeleteBox
          title={<>¿Eliminar categoría{" "}<span className="font-bold">{cat.label_es}</span>?</>}
          subtext="Se marcará como inactiva y no se mostrará en el FAQ público."
          busy={isCatBusy}
          onConfirm={() => onDeleteCat(cat.id)}
          onCancel={() => onCancelRow(`cat-${cat.id}`)}
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
            total={total}
            isMoving={moving === `cat-${cat.id}`}
            anyBusy={anyBusy}
            onMoveUp={() => onMoveCat(cat.id, "up")}
            onMoveDown={() => onMoveCat(cat.id, "down")}
            onEdit={() => onCatEditStart(cat)}
            onDelete={() => onSetConfirmDelete(`cat-${cat.id}`)}
          />

          <FAQQuestionList
            questions={questions}
            catId={cat.id}
            catMode={catMode}
            qEdit={qEdit}
            newQuestionFor={newQuestionFor}
            newQ={newQ}
            busy={busy}
            moving={moving}
            anyBusy={anyBusy}
            getMode={getMode}
            onMoveQ={onMoveQ}
            onQEditStart={onQEditStart}
            onQEditChange={onQEditChange}
            onSaveQ={onSaveQ}
            onDeleteQ={onDeleteQ}
            onCancelRow={onCancelRow}
            onSetConfirmDelete={onSetConfirmDelete}
            onShowNewQuestion={onShowNewQuestion}
            onCancelNewQuestion={onCancelNewQuestion}
            onSetNewQ={onSetNewQ}
            onSubmitNewQuestion={onSubmitNewQuestion}
          />
        </>
      )}
    </div>
  );
}
