"use client";

import { useState, useRef } from "react";
import { ACCEPTED_MIME } from "./helpers";

type Props = {
  onFiles: (files: FileList | File[]) => void;
};

export function ImageUploader({ onFiles }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onFiles(e.target.files);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  return (
    <>
      {/* Hidden file input lives outside <button> to keep interactive-content nesting valid */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={handleFileInputChange}
      />
      <button
        type="button"
        aria-label="Zona de carga de imágenes. Arrastra archivos o presiona Enter para seleccionar"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full relative min-h-[240px] cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 md:min-h-[300px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          dragOver
            ? "border-primary/60 bg-primary/5 shadow-[0_0_0_4px_rgba(63,143,70,0.10)]"
            : "border-border-soft bg-surface-card hover:border-primary/30 hover:bg-primary/[0.03]"
        }`}
      >
        <div className="flex h-full min-h-[176px] flex-col items-center justify-center gap-4 md:min-h-[236px]">
          <span className="text-4xl text-text-faint/40 md:text-5xl">
            {dragOver ? "⬇" : "📁"}
          </span>
          <div>
            <p className="text-base font-semibold text-text-sub md:text-lg">
              {dragOver
                ? "Suelta las imágenes aquí"
                : "Arrastra imágenes o haz clic para seleccionar"}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              .webp, .jpg, .png &mdash; máx 2MB por archivo
            </p>
          </div>
        </div>
      </button>
    </>
  );
}
