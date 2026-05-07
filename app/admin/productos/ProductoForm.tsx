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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {error && (
        <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Información básica */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Información básica
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Precio</h2>
        <div className="max-w-xs">
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
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Imagen</h2>
        {form.image && (
          <div className="mb-3 relative w-24 h-24 rounded-lg overflow-hidden bg-gray-800">
            <Image src={form.image} alt="preview" fill className="object-cover" />
          </div>
        )}
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors">
            {uploading ? "Subiendo..." : "Subir imagen"}
          </span>
          <span className="text-xs text-gray-500">.webp, .jpg, .png — máx 2MB</span>
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
          <p className="text-xs text-gray-500 mt-2">{form.image}</p>
        )}
      </section>

      {/* Descripción */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Descripción</h2>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          required
          maxLength={300}
          rows={3}
          className={`${inputCls} resize-none`}
        />
        <p className="text-xs text-gray-500 mt-1">{form.description.length}/300</p>
      </section>

      {/* Ingredientes */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Ingredientes</h2>
        <div className="space-y-2 mb-3">
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg">{ing}</span>
              <button
                type="button"
                onClick={() => set("ingredients", form.ingredients.filter((_, j) => j !== i))}
                className="text-gray-500 hover:text-red-400 text-xs px-2"
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
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            +
          </button>
        </div>
      </section>

      {/* Beneficios */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Beneficios</h2>
        <div className="space-y-2 mb-3">
          {form.benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg">{b}</span>
              <button
                type="button"
                onClick={() => set("benefits", form.benefits.filter((_, j) => j !== i))}
                className="text-gray-500 hover:text-red-400 text-xs px-2"
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
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            +
          </button>
        </div>
      </section>

      {/* Estado */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Estado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ToggleField label="Destacado" value={form.featured} onChange={(v) => set("featured", v)} />
          <ToggleField label="Más Vendido" value={form.isBestSeller} onChange={(v) => set("isBestSeller", v)} />
          <ToggleField label="Agotado" value={form.isSoldOut} onChange={(v) => set("isSoldOut", v)} />
          <ToggleField label="Activo" value={form.active} onChange={(v) => set("active", v)} />
        </div>
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-600 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/productos")}
          className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5 cursor-pointer">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-green-500" : "bg-gray-600"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
