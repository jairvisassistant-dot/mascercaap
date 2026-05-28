"use client";

import { AnimatePresence, m } from "framer-motion";
import type { Dictionary } from "@/lib/i18n";

const WA_ICON = (
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
);

type Props = {
  t: Dictionary["chatbot"];
  th: Dictionary["helpHub"];
  showAdvisorButton: boolean;
  showFallbackActions: boolean;
  showLeadForm: boolean;
  onAdvisorClick: (source: "advisor_pill" | "fallback_whatsapp") => void;
  onContactClick: () => void;
};

export default function FaqAnswerView({
  t,
  th,
  showAdvisorButton,
  showFallbackActions,
  showLeadForm,
  onAdvisorClick,
  onContactClick,
}: Props) {
  return (
    <>
      {/* Pill de asesor — aparece después de cada respuesta exitosa */}
      <AnimatePresence>
        {showAdvisorButton && !showFallbackActions && !showLeadForm && (
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 pl-1 pt-1"
          >
            <span className="text-xs text-text-faint">{t.advisorOffer}</span>
            <button
              type="button"
              onClick={() => onAdvisorClick("advisor_pill")}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-colors font-medium shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
            >
              <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
                {WA_ICON}
              </svg>
              {t.talkToAdvisor}
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* Fallback — el bot no sabe responder */}
      <AnimatePresence>
        {showFallbackActions && !showLeadForm && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 pl-1"
          >
            <p className="text-xs text-text-muted font-medium">{th.contactOptions}</p>
            <button
              type="button"
              onClick={() => onAdvisorClick("fallback_whatsapp")}
              className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                {WA_ICON}
              </svg>
              {th.menu.whatsapp}
            </button>
            <button
              type="button"
              onClick={onContactClick}
              className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary hover:text-white transition-colors font-medium w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {th.menu.contact}
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
