"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRADIENT_PRESETS } from "@/lib/gradient-presets";

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function NuevaLineaForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [iconEmoji, setIconEmoji] = useState("🛍️");
  const [gradient, setGradient] = useState<string>(GRADIENT_PRESETS[0].tw);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!keyTouched) {
      setKey(slugify(value));
    }
  }

  function handleKeyChange(value: string) {
    setKeyTouched(true);
    setKey(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/product-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label, description, gradient, iconEmoji }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando línea");

      router.push("/admin/productos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creando línea");
    } finally {
      setSaving(false);
    }
  }

  const selectedPreset = GRADIENT_PRESETS.find((p) => p.tw === gradient);

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
          Información básica
        </h2>
        <div className="space-y-4">
          <Field label="Nombre de la línea *">
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              required
              placeholder="ej: Jugos de Mora"
              className={inputCls}
            />
          </Field>

          <Field label="Identificador (key) *">
            <input
              type="text"
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              required
              placeholder="ej: jugos-de-mora"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-text-muted">
              Solo letras, números y guiones. Se usa internamente para identificar la línea.
            </p>
          </Field>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Breve descripción de la línea de producto..."
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1 text-xs text-text-muted">{description.length}/200</p>
          </Field>

          <Field label="Emoji / Ícono">
            <input
              type="text"
              value={iconEmoji}
              onChange={(e) => setIconEmoji(e.target.value)}
              maxLength={2}
              placeholder="🛍️"
              className={`${inputCls} w-24 text-2xl`}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
          Color de acento
        </h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setGradient(preset.tw)}
              title={preset.label}
              className={`group relative h-14 rounded-2xl bg-gradient-to-br transition-all ${preset.tw} ${
                gradient === preset.tw
                  ? "ring-2 ring-offset-2 ring-primary scale-105 shadow-lg"
                  : "opacity-75 hover:opacity-100 hover:scale-105"
              }`}
            >
              <span className="absolute inset-0 flex items-end justify-center pb-1.5 text-[10px] font-semibold text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
        {selectedPreset && (
          <p className="mt-3 text-xs text-text-muted">
            Seleccionado: <span className="font-semibold text-text-sub">{selectedPreset.label}</span>
          </p>
        )}

        {/* Preview */}
        <div className="mt-4 flex items-center gap-3">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-md`}>
            {iconEmoji}
          </div>
          <div>
            <p className="font-semibold text-text-main">{label || "Nombre de la línea"}</p>
            <p className="text-xs text-text-muted">{description || "Descripción de la línea"}</p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4 border-t border-border-soft pt-4">
        <button
          type="submit"
          disabled={saving || !key || !label}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          {saving ? "Creando..." : "Crear línea"}
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
