"use client";

import { useEffect, useRef, useEffectEvent } from "react";
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

const PREPARATION_NOTICE = {
  es: "Producto no listo para consumo directo. Debe diluirse antes de consumir. Ideal para jugos, coctelería, repostería y bebidas refrescantes. Elaborado bajo altos estándares y rigurosos controles de calidad. Hecho en Colombia.",
  en: "Not ready for direct consumption. Must be diluted before drinking. Ideal for juices, cocktails, baking, and refreshing beverages. Made under high standards and rigorous quality controls. Made in Colombia.",
} as const

export default function ProductLightbox({ product, isOpen, onClose, dict, lang }: ProductLightboxProps) {
  const t = dict.products.lightbox;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const pl = dict.productLines as Record<string, { label: string; description: string }>;
  const displayName = pl[product.line]?.label ?? product.name;
  const displayDescription =
    lang !== "es"
      ? (pl[product.line]?.description ?? product.description)
      : product.description;
  const preparationNotice = lang === "es" ? PREPARATION_NOTICE.es : PREPARATION_NOTICE.en;

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else {
      (previousFocusRef.current as HTMLElement | null)?.focus();
    }
  }, [isOpen]);

  const stableOnClose = useEffectEvent(onClose);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { stableOnClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]); // stableOnClose is stable by definition (useEffectEvent) — not a dep

  if (!isOpen || !product.image) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      open
      aria-label={displayName}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 m-0 max-w-none max-h-none w-full h-full bg-transparent border-0 outline-none"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface-card shadow-[0_32px_80px_rgba(15,23,42,0.28)] ring-1 ring-border-soft sm:max-h-[90vh] sm:flex-row">

        {/* Close button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
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
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6 sm:p-8">
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

          <p className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2 text-xs leading-relaxed text-text-sub">
            {preparationNotice}
          </p>

          {product.benefits && product.benefits.length > 0 && (
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
            type="button"
            onClick={onClose}
            className="mt-2 self-start rounded-xl border border-border-mid px-5 py-2.5 text-sm font-semibold text-text-sub transition hover:border-primary-light hover:bg-primary-light/15 hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t.close}
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}
