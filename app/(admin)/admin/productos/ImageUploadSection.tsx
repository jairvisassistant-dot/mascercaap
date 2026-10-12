"use client";

import Image from "next/image";

type Props = {
  imageUrl: string;
  uploading: boolean;
  saving: boolean;
  showInlineSave: boolean;
  onFileChange: (file: File) => void;
};

export function ImageUploadSection({
  imageUrl,
  uploading,
  saving,
  showInlineSave,
  onFileChange,
}: Props) {
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Imagen</h2>
      {imageUrl && (
        <div className="relative mb-3 size-24 overflow-hidden rounded-2xl bg-surface-warm ring-1 ring-border-soft">
          <Image src={imageUrl} alt="preview" fill sizes="96px" className="object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <span className="rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark">
            {uploading ? "Subiendo..." : "Subir imagen"}
          </span>
          <span className="text-xs text-text-muted">.webp, .jpg, .png (máx 2MB)</span>
          <input
            type="file"
            accept="image/webp,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChange(file);
            }}
          />
        </label>
        {showInlineSave && (
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(63,143,70,0.8)] transition-[transform,opacity,background-color] hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        )}
      </div>
      {imageUrl && <p className="mt-2 text-xs text-text-muted">{imageUrl}</p>}
    </section>
  );
}
