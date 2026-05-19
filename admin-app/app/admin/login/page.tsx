"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Step = "credentials" | "totp";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [factorIds, setFactorIds] = useState<string[]>([]);
  const [selectedFactor, setSelectedFactor] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Enfocar el primer input del codigo TOTP al entrar al step 2
  useEffect(() => {
    if (step === "totp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  // ── Step 1: Login con credenciales ────────────────────────────────────
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Credenciales invalidas");
        return;
      }

      if (data.needs_mfa) {
        // Pasar al step 2 - verificacion TOTP
        setMfaToken(data.mfa_token);
        setFactorIds(data.factor_ids ?? []);
        setSelectedFactor(data.factor_ids?.[0] ?? "");
        setStep("totp");
        return;
      }

      // Sin MFA -> redirigir directo
      router.push("/admin/productos");
    } catch (err) {
      console.error("Error en login admin:", err instanceof Error ? err.message : "unknown");
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verificacion TOTP ─────────────────────────────────────────
  function handleCodeChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-avanzar al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleMFASubmit() {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Ingresa el codigo completo de 6 digitos");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mfa_token: mfaToken,
          factor_id: selectedFactor,
          code: fullCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Codigo incorrecto");
        return;
      }

      router.push("/admin/productos");
    } catch (err) {
      console.error("Error en verificación 2FA:", err instanceof Error ? err.message : "unknown");
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToCredentials() {
    setStep("credentials");
    setCode(["", "", "", "", "", ""]);
    setError("");
    setMfaToken("");
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12 text-text-main">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 8% 12%, rgba(63,143,70,0.07) 0%, transparent 45%), radial-gradient(circle at 92% 88%, rgba(229,138,34,0.05) 0%, transparent 40%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, var(--primary-dark) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-[0_18px_42px_-20px_rgba(63,143,70,0.75)]">
            AP
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-accent-dark">
            Administracion
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Mas Cerca AP</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            {step === "credentials"
              ? "Ingrese para gestionar el catalogo de productos."
              : "Ingresa el codigo de verificacion de tu app autenticadora."}
          </p>
        </div>

        {step === "credentials" ? (
          /* ─── Step 1: Email + Password ─────────────────────────── */
          <form
            onSubmit={handleCredentialsSubmit}
            className="space-y-5 rounded-3xl border border-border-soft bg-surface-card p-7 shadow-[0_24px_70px_-34px_rgba(47,111,54,0.45)]"
          >
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold text-text-sub">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-text-sub">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="********"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-card active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <p className="text-center text-xs leading-relaxed text-text-faint">
              Acceso interno para el equipo de Mas Cerca AP.
            </p>
          </form>
        ) : (
          /* ─── Step 2: Codigo TOTP ──────────────────────────────── */
          <div className="space-y-6 rounded-3xl border border-border-soft bg-surface-card p-7 shadow-[0_24px_70px_-34px_rgba(47,111,54,0.45)]">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl">
                🔐
              </div>
              <h2 className="text-lg font-bold text-text-main">Verificacion en dos pasos</h2>
              <p className="mt-1 text-sm text-text-muted">
                Ingresa el codigo de 6 digitos de tu app autenticadora.
              </p>
            </div>

            {/* Selector de factor (si hay mas de uno) */}
            {factorIds.length > 1 && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-text-sub">
                  Dispositivo
                </label>
                <select
                  value={selectedFactor}
                  onChange={(e) => setSelectedFactor(e.target.value)}
                  className="w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-text-main transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {factorIds.map((id, i) => (
                    <option key={id} value={id}>
                      Autenticador {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Inputs de 6 digitos */}
            <div>
              <label className="mb-3 block text-center text-sm font-semibold text-text-sub">
                Codigo de verificacion
              </label>
              <div className="flex justify-center gap-2">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="h-14 w-12 rounded-xl border border-border-mid bg-surface-card text-center text-xl font-bold text-text-main transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              onClick={handleMFASubmit}
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-card active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              {loading ? "Verificando..." : "Verificar"}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              className="w-full text-center text-sm text-text-muted transition-colors hover:text-primary"
            >
              ← Volver al inicio de sesion
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href={process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "https://mascercap.com"}
            className="text-sm text-text-muted transition-colors hover:text-primary"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>
    </div>
  );
}
