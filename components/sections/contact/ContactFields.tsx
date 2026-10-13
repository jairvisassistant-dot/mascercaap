"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { FormFields, FieldErrors, AvailabilityCopy } from "./types";

interface ContactFieldsProps {
  t: {
    labels: {
      name: string;
      company: string;
      email: string;
      phone: string;
      message: string;
      otherReason: string;
    };
    placeholders: {
      name: string;
      company: string;
      email: string;
      phone: string;
      message: string;
      otherReason: string;
    };
    consentLabel: string;
    consentRequired: string;
    viewPolicyLabel: string;
  };
  lang: Locale;
  fields: FormFields;
  fieldErrors: FieldErrors;
  consented: boolean;
  consentError: boolean;
  availability: AvailabilityCopy;
  onFieldChange: (key: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onConsentChange: (value: boolean) => void;
}

export default function ContactFields({
  t,
  lang,
  fields,
  fieldErrors,
  consented,
  consentError,
  availability,
  onFieldChange,
  onConsentChange,
}: ContactFieldsProps) {
  return (
    <>
      {/* Motivo — visible solo cuando tipo es "otro" */}
      {fields.tipo === "otro" && (
        <div>
          <label htmlFor="motivoOtro" className="block text-sm font-medium text-text-sub mb-1">
            {t.labels.otherReason}
          </label>
          <input
            id="motivoOtro"
            type="text"
            value={fields.motivoOtro}
            onChange={onFieldChange("motivoOtro")}
            maxLength={200}
            className={`w-full px-4 py-3 rounded-lg border ${
              fieldErrors.motivoOtro ? "border-red-500" : "border-border-mid"
            } focus-visible:ring-2 focus-visible:ring-primary focus:border-transparent transition-[border-color,box-shadow] bg-surface-card text-text-main`}
            placeholder={t.placeholders.otherReason}
          />
          {fieldErrors.motivoOtro && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.motivoOtro}</p>
          )}
        </div>
      )}

      {/* Nombre */}
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-text-sub mb-1">
          {t.labels.name}
        </label>
        <input
          id="nombre"
          type="text"
          autoComplete="name"
          value={fields.nombre}
          onChange={onFieldChange("nombre")}
            className={`w-full px-4 py-3 rounded-lg border ${
              fieldErrors.nombre ? "border-red-500" : "border-border-mid"
            } focus-visible:ring-2 focus-visible:ring-primary focus:border-transparent transition-[border-color,box-shadow] bg-surface-card text-text-main`}
          placeholder={t.placeholders.name}
        />
        {fieldErrors.nombre && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.nombre}</p>
        )}
      </div>

      {/* Empresa */}
      <div>
        <label htmlFor="empresa" className="block text-sm font-medium text-text-sub mb-1">
          {t.labels.company}
        </label>
        <input
          id="empresa"
          type="text"
          autoComplete="organization"
          value={fields.empresa}
          onChange={onFieldChange("empresa")}
          className="w-full px-4 py-3 rounded-lg border border-border-mid focus-visible:ring-2 focus-visible:ring-primary focus:border-transparent transition-[border-color,box-shadow] bg-surface-card text-text-main"
          placeholder={t.placeholders.company}
        />
      </div>

      {/* Email + Teléfono */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-sub mb-1">
            {t.labels.email}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={onFieldChange("email")}
            className={`w-full px-4 py-3 rounded-lg border ${
              fieldErrors.email ? "border-red-500" : "border-border-mid"
            } focus-visible:ring-2 focus-visible:ring-primary focus:border-transparent transition-[border-color,box-shadow] bg-surface-card text-text-main`}
            placeholder={t.placeholders.email}
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-text-sub mb-1">
            {t.labels.phone}
          </label>
          <input
            id="telefono"
            type="tel"
            autoComplete="tel"
            value={fields.telefono}
            onChange={onFieldChange("telefono")}
            className={`w-full px-4 py-3 rounded-lg border ${
              fieldErrors.telefono ? "border-red-500" : "border-border-mid"
            } focus-visible:ring-2 focus-visible:ring-primary focus:border-transparent transition-[border-color,box-shadow] bg-surface-card text-text-main`}
            placeholder={t.placeholders.phone}
          />
          {fieldErrors.telefono && (
            <p className="text-red-500 text-sm mt-1">{fieldErrors.telefono}</p>
          )}
        </div>
      </div>

      {/* Mensaje */}
      <div>
        <label htmlFor="mensaje" className="block text-sm font-medium text-text-sub mb-1">
          {t.labels.message}
        </label>
        <textarea
          id="mensaje"
          value={fields.mensaje}
          onChange={onFieldChange("mensaje")}
          rows={4}
            className={`w-full px-4 py-3 rounded-lg border ${
              fieldErrors.mensaje ? "border-red-500" : "border-border-mid"
          } focus-visible:ring-2 focus-visible:ring-primary focus:border-transparent transition-[border-color,box-shadow] bg-surface-card text-text-main`}
          placeholder={fields.tipo === "disponibilidad" ? availability.additionalInfoLabel : t.placeholders.message}
        />
        {fieldErrors.mensaje && (
          <p className="text-red-500 text-sm mt-1">{fieldErrors.mensaje}</p>
        )}
      </div>

      {/* Consentimiento — requerido por Ley 1581/2012 Colombia */}
      <div>
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border-mid accent-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <span className="text-sm text-text-sub">
            {t.consentLabel}{" "}
            <Link
              href={`/${lang}/politicas`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary-dark"
            >
              {t.viewPolicyLabel}
            </Link>
          </span>
        </label>
        {consentError && (
          <p className="text-red-500 text-sm mt-1">{t.consentRequired}</p>
        )}
      </div>
    </>
  );
}
