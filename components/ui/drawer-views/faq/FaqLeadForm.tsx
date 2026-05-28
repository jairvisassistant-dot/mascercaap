"use client";

import { m } from "framer-motion";
import type { Dictionary, Locale } from "@/lib/i18n";

const WA_ICON = (
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
);

type LeadTipo = "pedido" | "negocio" | "consulta";
type LeadData = { nombre: string; email: string; tipo: LeadTipo | "" };

type Props = {
  t: Dictionary["chatbot"];
  lang: Locale;
  leadData: LeadData;
  leadConsent: boolean;
  leadSaveError: boolean;
  onFieldChange: (field: keyof LeadData, value: string) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
  onContinueAnyway: () => void;
};

export default function FaqLeadForm({
  t,
  lang,
  leadData,
  leadConsent,
  leadSaveError,
  onFieldChange,
  onConsentChange,
  onSubmit,
  onSkip,
  onContinueAnyway,
}: Props) {
  const TIPO_LABELS: Record<LeadTipo, string> = {
    pedido: t.leadTipoPedido,
    negocio: t.leadTipoNegocio,
    consulta: t.leadTipoConsulta,
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border border-border-mid bg-surface-card shadow-sm p-4 mx-1"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {/* Nombre */}
        <div>
          <label htmlFor="faq-lead-nombre" className="block text-xs font-semibold text-text-sub mb-1">
            {t.leadName} <span className="text-accent">*</span>
          </label>
          <input
            id="faq-lead-nombre"
            type="text"
            value={leadData.nombre}
            onChange={(e) => onFieldChange("nombre", e.target.value)}
            placeholder={t.leadNamePlaceholder}
            required
            className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="faq-lead-email" className="block text-xs font-semibold text-text-sub mb-1">
            {t.leadEmail}
          </label>
          <input
            id="faq-lead-email"
            type="email"
            value={leadData.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder={t.leadEmailPlaceholder}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Tipo de consulta */}
        <div>
          <p className="text-xs font-semibold text-text-sub mb-2">
            {t.leadTipo} <span className="text-accent">*</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {(["pedido", "negocio", "consulta"] as LeadTipo[]).map((tipo) => (
              <label
                key={tipo}
                className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  leadData.tipo === tipo
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border-mid text-text-sub hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={tipo}
                  checked={leadData.tipo === tipo}
                  onChange={() => onFieldChange("tipo", tipo)}
                  className="sr-only"
                />
                <span
                  className={`size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    leadData.tipo === tipo ? "border-primary" : "border-border-mid"
                  }`}
                >
                  {leadData.tipo === tipo && (
                    <span className="size-1.5 rounded-full bg-primary block" />
                  )}
                </span>
                {TIPO_LABELS[tipo]}
              </label>
            ))}
          </div>
        </div>

        {/* Consentimiento */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={leadConsent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-0.5 accent-primary shrink-0"
          />
          <span className="text-xs text-text-muted leading-relaxed">
            {t.leadConsent}{" "}
            <a
              href={`/${lang}/politicas`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {t.leadConsentLink}
            </a>
          </span>
        </label>

        {/* Error de red al guardar lead */}
        {leadSaveError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-xs text-amber-800">
              {lang === "es"
                ? "No pudimos guardar tu información por un error de red."
                : "We couldn't save your info due to a network error."}
            </p>
            <button
              type="button"
              onClick={onContinueAnyway}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors"
            >
              <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {WA_ICON}
              </svg>
              {lang === "es" ? "Continuar a WhatsApp de todas formas" : "Continue to WhatsApp anyway"}
            </button>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={!leadConsent || !leadData.nombre.trim() || !leadData.tipo}
            className="flex-1 inline-flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              {WA_ICON}
            </svg>
            {t.leadSubmit}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-text-faint hover:text-text-muted transition-colors px-2 shrink-0"
          >
            {t.leadSkip}
          </button>
        </div>
      </form>
    </m.div>
  );
}
