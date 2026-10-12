"use client";

import { m, AnimatePresence } from "framer-motion";
import EmojiIcon from "@/components/ui/EmojiIcon";

interface ContactSubmitFeedbackProps {
  submitStatus: "success" | "error" | null;
  whatsappUrl: string | null;
  t: {
    success: {
      title: string;
      text: string;
      quickResponse: string;
      whatsappButton: string;
      noWhatsappFallback: string;
    };
    error: string;
    close: string;
  };
  onReset: () => void;
}

export default function ContactSubmitFeedback({
  submitStatus,
  whatsappUrl,
  t,
  onReset,
}: ContactSubmitFeedbackProps) {
  return (
    <AnimatePresence>
      {submitStatus === "success" && (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          role="status"
          aria-live="polite"
          className="mt-5 rounded-2xl overflow-hidden border border-green-200"
        >
          <div className="bg-green-50 px-5 py-4 flex items-start gap-3">
            <EmojiIcon emoji="✅" label={t.success.title} size="md" tone="success" decorative={false} />
            <div className="flex-1">
              <p className="font-semibold text-green-800">{t.success.title}</p>
              <p className="text-sm text-green-700 mt-0.5">{t.success.text}</p>
            </div>
            <button
              type="button"
              onClick={onReset}
              aria-label={t.close}
              className="shrink-0 p-1 text-green-600 hover:text-green-800 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {whatsappUrl && (
            <div className="bg-surface-card px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-text-muted">{t.success.quickResponse}</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-full transition-[transform,box-shadow,outline-color,background-color] hover:scale-105 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {t.success.whatsappButton}
              </a>
            </div>
          )}
          {!whatsappUrl && (
            <div className="bg-surface-card px-5 py-4 border-t border-green-100">
              <p className="text-sm text-text-muted">{t.success.noWhatsappFallback}</p>
            </div>
          )}
        </m.div>
      )}
      {submitStatus === "error" && (
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          role="alert"
          aria-live="assertive"
          className="mt-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
        >
          <EmojiIcon emoji="❌" label={t.error} size="sm" tone="danger" decorative={false} />
          <p className="flex-1 text-sm">{t.error}</p>
          <button
            type="button"
            onClick={onReset}
            aria-label={t.close}
            className="shrink-0 p-1 text-red-500 hover:text-red-700 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
