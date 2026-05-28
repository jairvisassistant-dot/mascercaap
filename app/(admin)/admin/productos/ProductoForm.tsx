"use client";

import { useReducer, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateProductId } from "@/lib/id-generators";
import { Field, IdChip, inputCls } from "./form-primitives";
import { ImageUploadSection } from "./ImageUploadSection";
import { TagListSection } from "./TagListSection";
import { StatusToggles } from "./StatusToggles";

const LINES_FALLBACK: LineOption[] = [
  { key: "limon", label: "Zumo de Limón", categoryKey: null },
  { key: "limonada-cereza", label: "Limonada con Cereza", categoryKey: null },
  { key: "limonada-coco", label: "Limonada con Coco", categoryKey: null },
  { key: "maracuya", label: "Zumo de Maracuyá", categoryKey: null },
  { key: "pulpa-maracuya", label: "Pulpa de Maracuyá", categoryKey: null },
  { key: "pulpa-mora", label: "Pulpa de Mora", categoryKey: null },
  { key: "pulpa-fresa", label: "Pulpa de Fresa", categoryKey: null },
  { key: "pulpa-mango", label: "Pulpa de Mango", categoryKey: null },
  { key: "pulpa-guanabana", label: "Pulpa de Guanábana", categoryKey: null },
  { key: "pulpa-lulo", label: "Pulpa de Lulo", categoryKey: null },
  { key: "pulpa-guayaba", label: "Pulpa de Guayaba", categoryKey: null },
  { key: "pulpa-frutos-rojos", label: "Pulpa de Frutos Rojos", categoryKey: null },
  { key: "pulpa-frutos-amarillos", label: "Pulpa de Frutos Amarillos", categoryKey: null },
  { key: "pulpa-tomate-arbol", label: "Pulpa de Tomate de Árbol", categoryKey: null },
  { key: "kumiss", label: "Kumiss / Yogurt", categoryKey: null },
];

type FormData = {
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

type LineOption = { key: string; label: string; categoryKey?: string | null };
type Category = { key: string; label: string };

type Props = {
  mode: "create" | "edit";
  initial?: Partial<FormData & { id: string }>;
  productId?: string;
};

const defaultForm: FormData = {
  name: "",
  line: "",
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

type State = {
  form: FormData;
  lines: LineOption[];
  categories: Category[];
  selectedCategory: string;
  existingIds: Set<string>;
  loadingCatalog: boolean;
  newIngredient: string;
  newBenefit: string;
  uploading: boolean;
  saving: boolean;
  error: string;
};

type Action =
  | { type: "setFormField"; key: keyof FormData; value: FormData[keyof FormData] }
  | { type: "catalogLoaded"; lines: LineOption[]; categories: Category[]; existingIds: Set<string>; selectedCategory: string; lineKey: string }
  | { type: "catalogError"; message: string }
  | { type: "setCategory"; catKey: string; lineKey?: string }
  | { type: "setNewIngredient"; value: string }
  | { type: "addIngredient" }
  | { type: "setNewBenefit"; value: string }
  | { type: "addBenefit" }
  | { type: "uploadStart" }
  | { type: "uploadSuccess"; url: string }
  | { type: "uploadError"; message: string }
  | { type: "saveStart" }
  | { type: "saveError"; message: string }
  | { type: "clearError" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setFormField":
      return { ...state, form: { ...state.form, [action.key]: action.value } };
    case "catalogLoaded":
      return {
        ...state,
        lines: action.lines,
        categories: action.categories,
        existingIds: action.existingIds,
        loadingCatalog: false,
        selectedCategory: action.selectedCategory || state.selectedCategory,
        form: action.lineKey ? { ...state.form, line: action.lineKey } : state.form,
      };
    case "catalogError":
      return { ...state, loadingCatalog: false, error: action.message };
    case "setCategory":
      return {
        ...state,
        selectedCategory: action.catKey,
        form: action.lineKey !== undefined
          ? { ...state.form, line: action.lineKey }
          : state.form,
      };
    case "setNewIngredient":
      return { ...state, newIngredient: action.value };
    case "addIngredient":
      if (!state.newIngredient.trim()) return state;
      return {
        ...state,
        form: { ...state.form, ingredients: [...state.form.ingredients, state.newIngredient.trim()] },
        newIngredient: "",
      };
    case "setNewBenefit":
      return { ...state, newBenefit: action.value };
    case "addBenefit":
      if (!state.newBenefit.trim()) return state;
      return {
        ...state,
        form: { ...state.form, benefits: [...state.form.benefits, state.newBenefit.trim()] },
        newBenefit: "",
      };
    case "uploadStart":
      return { ...state, uploading: true, error: "" };
    case "uploadSuccess":
      return { ...state, uploading: false, form: { ...state.form, image: action.url } };
    case "uploadError":
      return { ...state, uploading: false, error: action.message };
    case "saveStart":
      return { ...state, saving: true, error: "" };
    case "saveError":
      return { ...state, saving: false, error: action.message };
    case "clearError":
      return { ...state, error: "" };
    default:
      return state;
  }
}

export default function ProductoForm({ mode, initial, productId }: Props) {
  const { push, refresh } = useRouter();

  const [state, dispatch] = useReducer(reducer, {
    form: { ...defaultForm, ...initial },
    lines: LINES_FALLBACK,
    categories: [],
    selectedCategory: "",
    existingIds: new Set<string>(),
    loadingCatalog: true,
    newIngredient: "",
    newBenefit: "",
    uploading: false,
    saving: false,
    error: "",
  });
  const { form, lines, categories, selectedCategory, existingIds, loadingCatalog, newIngredient, newBenefit, uploading, saving, error } = state;

  useEffect(() => {
    const controller = new AbortController();
    async function loadCatalog() {
      try {
        const [linesData, catsData, productsData] = await Promise.all([
          fetch("/api/admin/product-lines", { signal: controller.signal }).then((r) => r.json()),
          fetch("/api/admin/categories", { signal: controller.signal }).then((r) => r.json()),
          mode === "create" ? fetch("/api/admin/products", { signal: controller.signal }).then((r) => r.json()) : Promise.resolve([]),
        ]);

        const mappedLines: LineOption[] =
          Array.isArray(linesData) && linesData.length > 0
            ? linesData.map((l: Record<string, unknown>) => ({
                key: l.key as string,
                label: l.label as string,
                categoryKey: (l.category_key as string | null) ?? null,
              }))
            : LINES_FALLBACK;

        const mappedCategories: Category[] = Array.isArray(catsData) ? catsData : [];
        const mappedIds: Set<string> = Array.isArray(productsData)
          ? new Set(productsData.map((p: { id: string }) => p.id))
          : new Set();

        // Pre-select category from current line (edit mode)
        let selectedCat = "";
        const currentLineKey = initial?.line ?? "";
        if (currentLineKey) {
          const currentLine = mappedLines.find((l) => l.key === currentLineKey);
          if (currentLine?.categoryKey) selectedCat = currentLine.categoryKey;
        }

        // Default to first available line (create mode)
        let lineKey = "";
        if (mode === "create" && !initial?.line) {
          const firstLine = mappedLines[0];
          if (firstLine) {
            lineKey = firstLine.key;
            if (firstLine.categoryKey) selectedCat = firstLine.categoryKey;
          }
        }

        dispatch({
          type: "catalogLoaded",
          lines: mappedLines,
          categories: mappedCategories,
          existingIds: mappedIds,
          selectedCategory: selectedCat,
          lineKey,
        });
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        console.error("Error cargando catálogo:", err instanceof Error ? err.message : "unknown");
        dispatch({ type: "catalogError", message: "No se pudo cargar el catálogo. Recarga la página." });
      }
    }
    void loadCatalog();
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredLines = selectedCategory
    ? lines.filter((l) => l.categoryKey === selectedCategory)
    : lines;

  // Auto-generated product ID (create mode only)
  const { id: generatedId, adjusted: idAdjusted } = useMemo(() => {
    if (mode !== "create" || !form.line || !form.name.trim()) {
      return { id: "", adjusted: false };
    }
    return generateProductId(form.line, form.name, existingIds);
  }, [mode, form.line, form.name, existingIds]);

  function handleCategoryChange(catKey: string) {
    const newFiltered = catKey ? lines.filter((l) => l.categoryKey === catKey) : lines;
    const needsLineReset = newFiltered.length > 0 && !newFiltered.find((l) => l.key === form.line);
    dispatch({ type: "setCategory", catKey, lineKey: needsLineReset ? newFiltered[0].key : undefined });
  }

  // Generic form field setter — keeps JSX compact
  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    dispatch({ type: "setFormField", key, value });
  }

  async function handleImageUpload(file: File) {
    dispatch({ type: "uploadStart" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      dispatch({ type: "uploadSuccess", url: data.url });
    } catch (e) {
      dispatch({ type: "uploadError", message: e instanceof Error ? e.message : "Error subiendo imagen" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "saveStart" });

    const payload = {
      ...form,
      id: mode === "create" ? generatedId : productId,
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

      push("/admin/productos");
      refresh();
    } catch (e) {
      dispatch({ type: "saveError", message: e instanceof Error ? e.message : "Error guardando producto" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-6xl space-y-8 rounded-3xl border border-border-soft bg-surface-card p-7 shadow-[0_24px_70px_-40px_rgba(47,111,54,0.5)] lg:p-8"
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Paso 1: Categoría */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Paso 1 — Categoría
        </p>
        <p className="mb-4 text-xs text-text-muted">
          Elige a qué categoría pertenece este producto.
        </p>
        <Field label="Categoría *">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={loadingCatalog}
            className={`${inputCls} border-primary/30`}
          >
            <option value="">
              {loadingCatalog ? "Cargando categorías..." : "Selecciona una categoría"}
            </option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          {!loadingCatalog && categories.length === 0 && (
            <p className="mt-1.5 text-xs text-text-muted">
              No hay categorías creadas.{" "}
              <Link href="/admin/categorias/nueva" className="font-semibold text-primary underline">
                Crear categoría
              </Link>
            </p>
          )}
        </Field>
      </section>

      {/* Paso 2 — Línea */}
      <section className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-dark">
          Paso 2: Línea de producto
        </p>
        <p className="mb-4 text-xs text-text-muted">
          {selectedCategory
            ? "Líneas disponibles para la categoría seleccionada."
            : "Selecciona primero una categoría para filtrar las líneas."}
        </p>
        <Field label="Línea *">
          <select
            value={form.line}
            onChange={(e) => set("line", e.target.value)}
            disabled={loadingCatalog || filteredLines.length === 0}
            required
            className={inputCls}
          >
            {filteredLines.length === 0 ? (
              <option value="">
                {loadingCatalog ? "Cargando líneas..." : "Sin líneas para esta categoría"}
              </option>
            ) : (
              filteredLines.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))
            )}
          </select>
          {!loadingCatalog && selectedCategory && filteredLines.length === 0 && (
            <p className="mt-1.5 text-xs text-text-muted">
              No hay líneas en esta categoría.{" "}
              <Link href="/admin/lineas/nueva" className="font-semibold text-primary underline">
                Crear línea
              </Link>
            </p>
          )}
        </Field>
      </section>

      {/* Información del producto */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
          Información del producto
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nombre *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className={inputCls}
            />
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

        {/* ID chip — create mode: auto-generated / edit mode: fixed existing */}
        <div className="mt-4">
          {mode === "create" ? (
            <IdChip
              label="ID del producto"
              value={generatedId}
              adjusted={idAdjusted}
              empty={!generatedId}
              emptyHint={
                !form.line
                  ? "Selecciona una línea primero"
                  : !form.name.trim()
                    ? "Escribe el nombre para generar el ID"
                    : "—"
              }
            />
          ) : (
            <IdChip label="ID del producto" value={productId ?? ""} fixed />
          )}
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

      <ImageUploadSection
        imageUrl={form.image}
        uploading={uploading}
        saving={saving}
        showInlineSave={mode === "edit"}
        onFileChange={handleImageUpload}
      />

      {/* Descripción */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">Descripción</h2>
        <textarea
          aria-label="Descripción"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          required
          maxLength={300}
          rows={3}
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-xs text-text-muted">{form.description.length}/300</p>
      </section>

      <TagListSection
        title="Ingredientes"
        items={form.ingredients}
        newValue={newIngredient}
        inputAriaLabel="Nuevo ingrediente"
        inputPlaceholder="Agregar ingrediente..."
        onNewValueChange={(value) => dispatch({ type: "setNewIngredient", value })}
        onAdd={() => dispatch({ type: "addIngredient" })}
        onRemove={(i) => set("ingredients", form.ingredients.filter((_, j) => j !== i))}
      />

      <TagListSection
        title="Beneficios"
        items={form.benefits}
        newValue={newBenefit}
        inputAriaLabel="Nuevo beneficio"
        inputPlaceholder="Agregar beneficio..."
        onNewValueChange={(value) => dispatch({ type: "setNewBenefit", value })}
        onAdd={() => dispatch({ type: "addBenefit" })}
        onRemove={(i) => set("benefits", form.benefits.filter((_, j) => j !== i))}
      />

      <StatusToggles
        featured={form.featured}
        isBestSeller={form.isBestSeller}
        isSoldOut={form.isSoldOut}
        active={form.active}
        onFeaturedChange={(v) => set("featured", v)}
        onBestSellerChange={(v) => set("isBestSeller", v)}
        onSoldOutChange={(v) => set("isSoldOut", v)}
        onActiveChange={(v) => set("active", v)}
      />

      {/* Acciones */}
      <div className="flex items-center gap-4 border-t border-border-soft pt-4">
        <button
          type="submit"
          disabled={saving || uploading || (mode === "create" && !generatedId)}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.9)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        >
          {saving ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => push("/admin/productos")}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
