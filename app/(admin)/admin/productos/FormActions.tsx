"use client";

import { isSubmitDisabled, submitLabel, type ProductMode } from "./producto-form-utils";

type Props = {
  saving: boolean;
  uploading: boolean;
  mode: ProductMode;
  generatedId: string;
  onCancel: () => void;
};

export function FormActions({
  saving,
  uploading,
  mode,
  generatedId,
  onCancel,
}: Props) {
  return (
    <div className="flex items-center gap-4 border-t border-border-soft pt-4">
      <button
        type="submit"
        disabled={isSubmitDisabled(saving, uploading, mode, generatedId)}
        className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-[transform,opacity,background-color] hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
      >
        {submitLabel(saving, mode)}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
      >
        Cancelar
      </button>
    </div>
  );
}
