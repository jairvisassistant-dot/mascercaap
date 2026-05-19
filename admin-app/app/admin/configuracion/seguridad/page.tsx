"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type MfaState =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "enabled"; factors: { id: string; friendly_name: string | null; created_at: string }[] }
  | { status: "error"; message: string };

type EnrollStep = "idle" | "qr" | "verify";

export default function SeguridadPage() {
  const router = useRouter();
  const [mfaState, setMfaState] = useState<MfaState>({ status: "loading" });

  // Enrollment state
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("idle");
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cargar estado actual del MFA
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/mfa/status");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMfaState({ status: "error", message: data.error ?? "Error al cargar" });
        return;
      }
      if (data.mfa_enabled) {
        setMfaState({ status: "enabled", factors: data.factors });
      } else {
        setMfaState({ status: "disabled" });
      }
    } catch {
      setMfaState({ status: "error", message: "Error de conexión" });
    }
  }, [router]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // ── Enroll: iniciar ────────────────────────────────────────────────
  async function handleStartEnroll() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/mfa/enroll", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al generar QR");
        return;
      }

      setQrCode(data.qr_code);
      setFactorId(data.factor_id);
      setEnrollStep("qr");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // ── Enroll: verificar código ───────────────────────────────────────
  async function handleVerifyEnroll() {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Ingresá el código completo de 6 dígitos");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/mfa/verify-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factor_id: factorId, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Código incorrecto");
        return;
      }

      // Enrollment exitoso — recargar estado
      setEnrollStep("idle");
      setCode(["", "", "", "", "", ""]);
      setQrCode("");
      setFactorId("");
      await loadStatus();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // ── Deshabilitar ───────────────────────────────────────────────────
  async function handleDisable(factorIdToRemove: string) {
    if (!confirm("¿Estás seguro de deshabilitar la verificación en dos pasos?")) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/mfa/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factor_id: factorIdToRemove }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al deshabilitar");
        return;
      }

      await loadStatus();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers para inputs TOTP ──────────────────────────────────────
  function handleCodeChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
  }

  // ── Render principal ───────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-main">
          Seguridad
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Configuración de la verificación en dos pasos (2FA) para el acceso
          al panel de administración.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ── Estado: Cargando ─────────────────────────────────────── */}
      {mfaState.status === "loading" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <p className="text-sm text-text-muted">Cargando configuración...</p>
        </div>
      )}

      {/* ── Estado: Error ────────────────────────────────────────── */}
      {mfaState.status === "error" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <p className="text-sm text-red-600">{mfaState.message}</p>
          <button
            onClick={loadStatus}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Estado: Deshabilitado (pantalla de enrollment) ────────── */}
      {mfaState.status === "disabled" && enrollStep === "idle" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-lg">
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
            onClick={handleStartEnroll}
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          >
            {loading ? "Generando código QR..." : "Configurar verificación en dos pasos"}
          </button>
        </div>
      )}

      {/* ── Enrollment: Mostrar QR ───────────────────────────────── */}
      {mfaState.status === "disabled" && enrollStep === "qr" && (
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
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`}
                alt="Código QR para 2FA"
                className="h-48 w-48 rounded-xl border border-border-soft"
              />
            )}
          </div>

          <p className="mb-3 text-center text-sm font-semibold text-text-sub">
            Después de escanear, ingresá el código de 6 dígitos:
          </p>

          <div className="mb-4 flex justify-center gap-2">
            {code.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                className="h-14 w-12 rounded-xl border border-border-mid bg-surface-card text-center text-xl font-bold text-text-main transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ))}
          </div>

          <button
            onClick={handleVerifyEnroll}
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          >
            {loading ? "Verificando..." : "Verificar y activar"}
          </button>

          <button
            onClick={() => {
              setEnrollStep("idle");
              setCode(["", "", "", "", "", ""]);
              setQrCode("");
              setFactorId("");
              setError("");
            }}
            className="mt-3 w-full text-center text-sm text-text-muted transition-colors hover:text-primary"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Estado: Habilitado ────────────────────────────────────── */}
      {mfaState.status === "enabled" && (
        <div className="rounded-2xl border border-border-soft bg-surface-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-lg">
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
            {mfaState.factors.map((f) => (
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
            onClick={() => handleDisable(mfaState.factors[0]?.id ?? "")}
            disabled={loading}
            className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 font-semibold text-red-600 transition-all hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Deshabilitando..." : "Deshabilitar verificación en dos pasos"}
          </button>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => router.push("/admin/productos")}
          className="text-sm text-text-muted transition-colors hover:text-primary"
        >
          ← Volver al catálogo
        </button>
      </div>
    </div>
  );
}
