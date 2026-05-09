"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
        setError(data.error ?? "Credenciales inválidas");
        return;
      }

      router.push("/admin/productos");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-surface-soft px-4 py-12 text-text-main">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-28 top-[-140px] h-80 w-80 rounded-full bg-primary-light/45 blur-3xl" />
        <div className="absolute -right-24 bottom-[-120px] h-96 w-96 rounded-full bg-accent-light/35 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle, var(--primary-dark) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-[0_18px_42px_-20px_rgba(63,143,70,0.75)]">
            AP
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-accent-dark">
            Administración
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Mas Cerca AP</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">Ingresá para gestionar el catálogo de productos.</p>
        </div>

        <form
          onSubmit={handleSubmit}
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
              placeholder="admin@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-text-sub">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-card active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="text-center text-xs leading-relaxed text-text-faint">
            Acceso interno para el equipo de Más Cerca AP.
          </p>
        </form>
      </div>
    </div>
  );
}
