"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const LINES = [
  { key: "limon", label: "Zumo de Limón" },
  { key: "limonada-cereza", label: "Limonada con Cereza" },
  { key: "limonada-coco", label: "Limonada con Coco" },
  { key: "maracuya", label: "Zumo de Maracuyá" },
  { key: "pulpa-maracuya", label: "Pulpa de Maracuyá" },
  { key: "pulpa-mora", label: "Pulpa de Mora" },
  { key: "pulpa-fresa", label: "Pulpa de Fresa" },
  { key: "pulpa-mango", label: "Pulpa de Mango" },
  { key: "pulpa-guanabana", label: "Pulpa de Guanábana" },
  { key: "pulpa-lulo", label: "Pulpa de Lulo" },
  { key: "pulpa-guayaba", label: "Pulpa de Guayaba" },
  { key: "pulpa-frutos-rojos", label: "Pulpa de Frutos Rojos" },
  { key: "pulpa-frutos-amarillos", label: "Pulpa de Frutos Amarillos" },
  { key: "pulpa-tomate-arbol", label: "Pulpa de Tomate de Árbol" },
  { key: "kumiss", label: "Kumiss / Yogurt" },
];

type FormData = {
  id: string;
  name: string;
  line: string;
  presentation: string;
  presentationOrder: number;
  price: string;
  image: string;
  description: string;
  ingredients: string[];
  benefits: string[];
  isSoldOut: boolean;
  isBestSeller: boolean;
  featured: boolean;
  active: boolean;
  displayOrder: number;
};

type Props = {
  mode: "create" | "edit";
  initial?: Partial<FormData>;
  productId?: string;
};

const defaultForm: FormData = {
  id: "",
  name: "",
  line: "limon",
  presentation: "",
  presentationOrder: 1,
  price: "",
  image: "",
  description: "",
  ingredients: [],
  benefits: [],
  isSoldOut: false,
  isBestSeller: false,
  featured: false,
  active: true,
  displayOrder: 0,
};

export default function ProductoForm({ mode, initial, productId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initial });
  const [newIngredient, setNewIngredient] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set("image", data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error subiendo imagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      price: form.price !== "" ? Number(form.price) : null,
      image: form.image || null,
    };

    try {
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push("/admin/productos");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-6xl space-y-8 rounded-3xl border border-border-soft bg-surface-card p-7 shadow-[0_24px_70px_-40px_rgba(47,111,54,0.5)] lg:p-8">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Información básica */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
          Información básica
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mode === "create" && (
            <Field label="ID único *">
              <input
                type="text"
                value={form.id}
                onChange={(e) => set("id", e.target.value)}
                required
                placeholder="ej: pulpa-mora-120"
                className={inputCls}
              />
            </Field>
          )}
          <Field label="Nombre *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Línea *">
            <select
              value={form.line}
              onChange={(e) => set("line", e.target.value)}
              className={inputCls}
            >
              {LINES.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Presentación *">
            <input
              type="text"
              value={form.presentation}
              onChange={(e) => set("presentation", e.target.value)}
              required
              placeholder="ej: 300g, 1L"
              className={inputCls}
            />
          </Field>
          <Field label="Orden dentro de línea">
            <input
              type="number"
              value={form.presentationOrder}
              onChange={(e) => set("presentationOrder", Number(e.target.value))}
              min={1}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Precio */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Precio</h2>
        <div className="max-w-sm">
          <Field label="Precio (COP)">
            <input
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              min={0}
              placeholder="Opcional"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Imagen */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Imagen</h2>
        {form.image && (
          <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-2xl bg-surface-warm ring-1 ring-border-soft">
            <Image src={form.image} alt="preview" fill className="object-cover" />
          </div>
        )}
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark">
            {uploading ? "Subiendo..." : "Subir imagen"}
          </span>
          <span className="text-xs text-text-muted">.webp, .jpg, .png — máx 2MB</span>
          <input
            type="file"
            accept="image/webp,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
        </label>
        {form.image && (
          <p className="mt-2 text-xs text-text-muted">{form.image}</p>
        )}
      </section>

      {/* Descripción */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Descripción</h2>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          required
          maxLength={300}
          rows={3}
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-xs text-text-muted">{form.description.length}/300</p>
      </section>

      {/* Ingredientes */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Ingredientes</h2>
        <div className="mb-3 space-y-2">
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 rounded-xl bg-surface-warm px-3 py-2 text-sm text-text-sub ring-1 ring-border-soft">{ing}</span>
              <button
                type="button"
                onClick={() => set("ingredients", form.ingredients.filter((_, j) => j !== i))}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newIngredient.trim()) {
                  set("ingredients", [...form.ingredients, newIngredient.trim()]);
                  setNewIngredient("");
                }
              }
            }}
            placeholder="Agregar ingrediente..."
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              if (newIngredient.trim()) {
                set("ingredients", [...form.ingredients, newIngredient.trim()]);
                setNewIngredient("");
              }
            }}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            +
          </button>
        </div>
      </section>

      {/* Beneficios */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Beneficios</h2>
        <div className="mb-3 space-y-2">
          {form.benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 rounded-xl bg-surface-warm px-3 py-2 text-sm text-text-sub ring-1 ring-border-soft">{b}</span>
              <button
                type="button"
                onClick={() => set("benefits", form.benefits.filter((_, j) => j !== i))}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newBenefit.trim()) {
                  set("benefits", [...form.benefits, newBenefit.trim()]);
                  setNewBenefit("");
                }
              }
            }}
            placeholder="Agregar beneficio..."
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              if (newBenefit.trim()) {
                set("benefits", [...form.benefits, newBenefit.trim()]);
                setNewBenefit("");
              }
            }}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            +
          </button>
        </div>
      </section>

      {/* Estado */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Estado</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ToggleField label="Destacado" value={form.featured} onChange={(v) => set("featured", v)} />
          <ToggleField label="Más Vendido" value={form.isBestSeller} onChange={(v) => set("isBestSeller", v)} />
          <ToggleField label="Agotado" value={form.isSoldOut} onChange={(v) => set("isSoldOut", v)} />
          <ToggleField label="Activo" value={form.active} onChange={(v) => set("active", v)} />
        </div>
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-4 border-t border-border-soft pt-4">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          {saving ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
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

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border-soft bg-surface-warm px-3 py-3">
      <span className="text-sm font-medium text-text-sub">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-warm ${value ? "bg-primary" : "bg-border-mid"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
