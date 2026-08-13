"use client"

import React from "react"
import { m } from "framer-motion"
import type { Action, SubmitStatus } from "./types"

type Props = {
  nombre: string
  email: string
  waNumber: string
  consent: boolean
  status: SubmitStatus
  canSubmit: boolean
  t: {
    step6Label: string
    nameLabel: string
    namePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    whatsappLabel: string
    whatsappPlaceholder: string
    contactHint: string
    consentLabel: string
    errorText: string
    sending: string
    ctaEmail: string
  }
  dispatch: React.Dispatch<Action>
  onSubmit: () => void
}

export default function OrderContactForm({
  nombre, email, waNumber, consent, status, canSubmit, t, dispatch, onSubmit,
}: Props) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-sm font-semibold text-text-main mb-4">
        <span className="text-primary mr-2">5.</span>{t.step6Label}
      </p>

      <div className="space-y-3">
        <div>
          <label htmlFor="oa-nombre" className="block text-xs font-medium text-text-muted mb-1">{t.nameLabel} *</label>
          <input
            id="oa-nombre"
            type="text"
            value={nombre}
            onChange={(e) => dispatch({ type: "setContact", field: "nombre", value: e.target.value })}
            placeholder={t.namePlaceholder}
            className="w-full rounded-lg border border-border-mid px-3 py-2.5 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="oa-email" className="block text-xs font-medium text-text-muted mb-1">{t.emailLabel}</label>
          <input
            id="oa-email"
            type="email"
            value={email}
            onChange={(e) => dispatch({ type: "setContact", field: "email", value: e.target.value })}
            placeholder={t.emailPlaceholder}
            className="w-full rounded-lg border border-border-mid px-3 py-2.5 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="oa-whatsapp" className="block text-xs font-medium text-text-muted mb-1">{t.whatsappLabel}</label>
          <input
            id="oa-whatsapp"
            type="tel"
            value={waNumber}
            onChange={(e) => dispatch({ type: "setContact", field: "waNumber", value: e.target.value })}
            placeholder={t.whatsappPlaceholder}
            className="w-full rounded-lg border border-border-mid px-3 py-2.5 text-sm text-text-main bg-surface-page focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="text-xs text-text-muted mt-1">{t.contactHint}</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => dispatch({ type: "setConsent", value: e.target.checked })}
            className="mt-0.5 size-4 accent-primary shrink-0"
          />
          <span className="text-xs text-text-muted leading-relaxed">{t.consentLabel}</span>
        </label>
      </div>

      {status === "error" && (
        <p className="mt-3 text-xs text-red-600">{t.errorText}</p>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || status === "sending"}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-5 py-3 rounded-full transition-colors min-h-[44px] disabled:opacity-50"
        >
          {status === "sending" ? t.sending : t.ctaEmail}
        </button>
      </div>
    </m.div>
  )
}
