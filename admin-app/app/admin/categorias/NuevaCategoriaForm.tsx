"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateCategoryKey } from "@/lib/id-generators";

export default function NuevaCategoriaForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [loadingKey, setLoadingKey] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data: unknown[]) => {
        const count = Array.isArray(data) ? data.length : 0;
        setGeneratedKey(generateCategoryKey(count));
      })
      .catch(() => setGeneratedKey(generateCategoryKey(0)))
      .finally(() => setLoadingKey(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!generatedKey) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: generatedKey, label, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando categoría");
      router.push("/admin/productos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creando categoría");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl space-y-8 rounded-3xl border border-border-soft bg-surface-card p-7 shadow-[0_24px_70px_-40px_rgba(47,111,54,0.5)] lg:p-8"
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
          Información de la categoría
        </h2>
        <div className="space-y-4">
          <Field label="Nombre *">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              autoFocus
              placeholder="ej: Bebidas Exóticas"
              className={inputCls}
            />
          </Field>

          <IdChip
            label="Identificador"
            value={loadingKey ? "" : generatedKey}
            loading={loadingKey}
          />

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Descripción breve de esta categoría..."
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-xs text-text-muted">{description.length}/200</p>
          </Field>
        </div>
      </section>

      <div className="rounded-2xl border border-primary/15 bg-[#f7ffe6]/60 px-4 py-3 text-sm text-text-sub">
        Después de crear la categoría, podrás asignarle líneas de producto al crear o editar cada línea.
      </div>

      <div className="flex items-center gap-4 border-t border-border-soft pt-4">
        <button
          type="submit"
          disabled={saving || loadingKey || !label}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          {saving ? "Creando..." : "Crear categoría"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/productos")}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-border-mid bg-surface-card px-4 py-3 text-sm text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text-sub">{label}</label>
      {children}
    </div>
  );
}

function IdChip({
  label,
  value,
  loading,
  adjusted,
}: {
  label: string;
  value: string;
  loading?: boolean;
  adjusted?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-text-sub">{label}</p>
      <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-warm px-4 py-3">
        <span className="font-mono text-sm text-text-sub">
          {loading ? "Generando…" : value || "—"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {adjusted && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Ajustado
            </span>
          )}
          <span className="rounded-md bg-border-mid/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Auto
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-text-muted">Generado automáticamente. No es editable.</p>
    </div>
  );
}
