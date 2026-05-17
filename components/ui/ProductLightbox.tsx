"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Product } from "@/types";
import type { Dictionary } from "@/lib/i18n";

interface ProductLightboxProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  dict: Dictionary;
  lang: string;
}

export default function ProductLightbox({ product, isOpen, onClose, dict, lang }: ProductLightboxProps) {
  const t = dict.products.lightbox;
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[product.line]?.label ?? product.name;
  const displayDescription =
    lang !== "es"
      ? (pl[product.line]?.description ?? product.description)
      : product.description;

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product.image) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface-card shadow-[0_32px_80px_rgba(15,23,42,0.28)] ring-1 ring-border-soft sm:flex-row">

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Image panel */}
        <div className="flex min-h-[260px] flex-shrink-0 items-center justify-center bg-surface-warm p-8 sm:min-h-0 sm:w-[44%] sm:p-10">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64">
            {/* alt: displayName comes from i18n dict; presentation (e.g. "120g") is a universal technical value — no translation needed */}
            <Image
              src={product.image}
              alt={`${displayName} ${product.presentation}`}
              fill
              className="object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
              sizes="(max-width: 640px) 224px, 256px"
              priority
            />
          </div>
        </div>

        {/* Info panel */}
        <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-9">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
              {pl[product.line]?.label ?? product.line}
            </p>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-text-main">
              {product.name}
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">{product.presentation}</p>
          </div>

          {displayDescription && (
            <p className="text-sm leading-relaxed text-text-sub">{displayDescription}</p>
          )}

          {lang === "es" && product.ingredients && product.ingredients.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
                {t.ingredients}
              </p>
              <p className="text-sm text-text-sub">{product.ingredients.join(", ")}</p>
            </div>
          )}

          {lang === "es" && product.benefits && product.benefits.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
                {t.benefits}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.benefits.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary-dark"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-2 self-start rounded-xl border border-border-mid px-5 py-2.5 text-sm font-semibold text-text-sub transition hover:border-primary-light hover:bg-primary-light/15 hover:text-primary-dark"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
