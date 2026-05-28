"use client";

import Image from "next/image";
import type { Factor, MfaStatus, EnrollStep } from "./types";

interface MFASectionProps {
  mfaStatus: MfaStatus;
  enrollStep: EnrollStep;
  qrCode: string;
  code: string[];
  error: string;
  loading: boolean;
  onStartEnroll: () => void;
  onVerifyEnroll: () => void;
  onDisable: (factorId: string) => void;
  onCodeChange: (index: number, value: string) => void;
  onCancelEnroll: () => void;
  onBack: () => void;
}

export function MFASection({
  mfaStatus,
  enrollStep,
  qrCode,
  code,
  error,
  loading,
  onStartEnroll,
  onVerifyEnroll,
  onDisable,
  onCodeChange,
  onCancelEnroll,
  onBack,
}: MFASectionProps) {
  return (
    <>
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ── Estado: Cargando ─────────────────────────────────────── */}
      {mfaStatus.status === "loading" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <p className="text-sm text-text-muted">Cargando configuración…</p>
        </div>
      )}

      {/* ── Estado: Error ────────────────────────────────────────── */}
      {mfaStatus.status === "error" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <p className="text-sm text-red-600">{mfaStatus.message}</p>
          <button
            type="button"
            onClick={onStartEnroll}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Estado: Deshabilitado (pantalla de enrollment) ────────── */}
      {mfaStatus.status === "disabled" && enrollStep === "idle" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-lg">
              ⚠️
            </div>
            <div>
              <h2 className="font-semibold text-text-main">
                Verificación en dos pasos
              </h2>
              <p className="text-sm text-text-muted">Deshabilitada</p>
            </div>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-text-muted">
            La verificación en dos pasos agrega una capa extra de seguridad a
            tu cuenta. Cada vez que inicies sesión, vas a necesitar un código
            de 6 dígitos generado por tu app autenticadora (Google
            Authenticator, Authy, 1Password, etc.).
          </p>

          <button
            type="button"
            onClick={onStartEnroll}
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          >
            {loading ? "Generando código QR…" : "Configurar verificación en dos pasos"}
          </button>
        </div>
      )}

      {/* ── Enrollment: Mostrar QR ───────────────────────────────── */}
      {mfaStatus.status === "disabled" && enrollStep === "qr" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-bold text-text-main">
              Escaneá el código QR
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Usá tu app autenticadora para escanear este código.
            </p>
          </div>

          <div className="mb-5 flex justify-center">
            {qrCode && (
              <Image
                src={`data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`}
                alt="Código QR para 2FA"
                width={192}
                height={192}
                unoptimized
                className="size-48 rounded-xl border border-border-soft"
              />
            )}
          </div>

          <p className="mb-3 text-center text-sm font-semibold text-text-sub">
            Después de escanear, ingresá el código de 6 dígitos:
          </p>

          <div className="mb-4 flex justify-center gap-2">
            {code.map((digit, i) => (
              <input
                key={`totp-digit-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                aria-label={`Dígito ${i + 1} de 6`}
                value={digit}
                onChange={(e) => onCodeChange(i, e.target.value)}
                className="h-14 w-12 rounded-xl border border-border-mid bg-surface-card text-center text-xl font-bold text-text-main transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onVerifyEnroll}
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          >
            {loading ? "Verificando…" : "Verificar y activar"}
          </button>

          <button
            type="button"
            onClick={onCancelEnroll}
            className="mt-3 w-full text-center text-sm text-text-muted transition-colors hover:text-primary"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Estado: Habilitado ────────────────────────────────────── */}
      {mfaStatus.status === "enabled" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-lg">
              ✅
            </div>
            <div>
              <h2 className="font-semibold text-text-main">
                Verificación en dos pasos
              </h2>
              <p className="text-sm font-medium text-green-700">Activada</p>
            </div>
          </div>

          <div className="mb-5 space-y-2">
            <p className="text-sm text-text-muted">
              Tu cuenta está protegida con autenticación de dos factores.
            </p>
            {mfaStatus.factors.map((f: Factor) => (
              <div
                key={f.id}
                className="rounded-xl border border-border-soft bg-surface-soft px-4 py-3"
              >
                <p className="text-sm font-medium text-text-main">
                  {f.friendly_name ?? "Autenticador"}
                </p>
                <p className="text-xs text-text-faint">
                  Desde{" "}
                  {new Date(f.created_at).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onDisable(mfaStatus.factors[0]?.id ?? "")}
            disabled={loading}
            className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-600 transition-all hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Deshabilitando…" : "Deshabilitar verificación en dos pasos"}
          </button>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-text-muted transition-colors hover:text-primary"
        >
          ← Volver al catálogo
        </button>
      </div>
    </>
  );
}
