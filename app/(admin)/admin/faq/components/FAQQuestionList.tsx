"use client";

import type { FAQCategoryRow } from "@/types";
import type { QuestionEdit, NewQuestion, Mode } from "./types";
import QuestionEditForm from "./QuestionEditForm";
import NewQuestionForm from "./NewQuestionForm";
import ConfirmDeleteBox from "./ConfirmDeleteBox";
import FAQQuestionItem from "./FAQQuestionItem";

type Question = FAQCategoryRow["faq_questions"][number];

interface FAQQuestionListProps {
  questions: Question[];
  catId: string;
  catMode: Mode;
  qEdit: Record<string, QuestionEdit>;
  newQuestionFor: string | null;
  newQ: NewQuestion;
  busy: string | null;
  moving: string | null;
  anyBusy: boolean;
  getMode: (prefix: string, id: string) => Mode;
  onMoveQ: (id: string, direction: "up" | "down") => void;
  onQEditStart: (q: Question) => void;
  onQEditChange: (id: string, patch: Partial<QuestionEdit>) => void;
  onSaveQ: (id: string) => void;
  onDeleteQ: (id: string) => void;
  onCancelRow: (key: string) => void;
  onSetConfirmDelete: (key: string) => void;
  onShowNewQuestion: (categoryId: string) => void;
  onCancelNewQuestion: () => void;
  onSetNewQ: (q: NewQuestion) => void;
  onSubmitNewQuestion: () => void;
}

export default function FAQQuestionList({
  questions,
  catId,
  catMode,
  qEdit,
  newQuestionFor,
  newQ,
  busy,
  moving,
  anyBusy,
  getMode,
  onMoveQ,
  onQEditStart,
  onQEditChange,
  onSaveQ,
  onDeleteQ,
  onCancelRow,
  onSetConfirmDelete,
  onShowNewQuestion,
  onCancelNewQuestion,
  onSetNewQ,
  onSubmitNewQuestion,
}: FAQQuestionListProps) {
  return (
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
              onCancel={() => onCancelRow(`q-${q.id}`)}
              onSave={() => onSaveQ(q.id)}
              onChange={(patch) => onQEditChange(q.id, patch)}
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
              onConfirm={() => onDeleteQ(q.id)}
              onCancel={() => onCancelRow(`q-${q.id}`)}
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
            onMoveUp={() => onMoveQ(q.id, "up")}
            onMoveDown={() => onMoveQ(q.id, "down")}
            onEdit={() => onQEditStart(q)}
            onDelete={() => onSetConfirmDelete(`q-${q.id}`)}
          />
        );
      })}

      {/* New question toggle */}
      {newQuestionFor === catId ? (
        <NewQuestionForm
          busy={busy === `newq-${catId}`}
          newQ={newQ}
          onChange={onSetNewQ}
          onSubmit={onSubmitNewQuestion}
          onCancel={onCancelNewQuestion}
        />
      ) : (
        catMode === "view" && (
          <button
            type="button"
            onClick={() => onShowNewQuestion(catId)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-mid px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            + Nueva pregunta
          </button>
        )
      )}
    </div>
  );
}
