"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Category = { key: string; label: string; description: string; display_order: number };
type Mode = "view" | "edit" | "confirm-delete";

export default function CategoriasList({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>(initial);
  const [moving, setMoving] = useState<string | null>(null);
  const [rowMode, setRowMode] = useState<Record<string, Mode>>({});
  const [editValues, setEditValues] = useState<Record<string, { label: string; description: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const getMode = (key: string): Mode => rowMode[key] ?? "view";

  function startEdit(cat: Category) {
    setEditValues((prev) => ({ ...prev, [cat.key]: { label: cat.label, description: cat.description } }));
    setRowMode((prev) => ({ ...prev, [cat.key]: "edit" }));
    setError("");
  }

  function cancelRow(key: string) {
    setRowMode((prev) => ({ ...prev, [key]: "view" }));
  }

  async function move(key: string, direction: "up" | "down") {
    setMoving(key);
    setError("");

    const idx = cats.findIndex((c) => c.key === key);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) { setMoving(null); return; }

    const next = [...cats];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setCats(next);

    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al reordenar");
      setCats(initial);
    } else {
      startTransition(() => router.refresh());
    }
    setMoving(null);
  }

  async function saveEdit(key: string) {
    const vals = editValues[key];
    if (!vals?.label.trim()) return;
    setBusy(key);
    setError("");

    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label: vals.label.trim(), description: vals.description.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
    } else {
      setCats((prev) => prev.map((c) => c.key === key ? { ...c, label: vals.label.trim(), description: vals.description.trim() } : c));
      setRowMode((prev) => ({ ...prev, [key]: "view" }));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  async function confirmDelete(key: string) {
    setBusy(key);
    setError("");

    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al eliminar");
      setRowMode((prev) => ({ ...prev, [key]: "view" }));
    } else {
      setCats((prev) => prev.filter((c) => c.key !== key));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  const anyBusy = busy !== null || moving !== null;

  return (
    <div className="w-full max-w-2xl space-y-3">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {cats.map((cat, idx) => {
        const mode = getMode(cat.key);
        const isBusy = busy === cat.key || moving === cat.key;

        if (mode === "edit") {
          const vals = editValues[cat.key] ?? { label: cat.label, description: cat.description };
          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-primary/40 bg-surface-card px-4 py-4 shadow-sm ring-1 ring-primary/15"
            >
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Editando · <span className="font-mono normal-case tracking-normal text-text-faint">{cat.key}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-sub">Nombre *</label>
                  <input
                    type="text"
                    autoFocus
                    value={vals.label}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [cat.key]: { ...vals, label: e.target.value } }))}
                    className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-sub">Descripción</label>
                  <textarea
                    value={vals.description}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [cat.key]: { ...vals, description: e.target.value } }))}
                    rows={2}
                    maxLength={200}
                    className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main placeholder:text-text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBusy || !vals.label.trim()}
                  onClick={() => saveEdit(cat.key)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => cancelRow(cat.key)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        }

        if (mode === "confirm-delete") {
          return (
            <div
              key={cat.key}
              className="rounded-2xl border border-red-200 bg-red-50/60 px-4 py-4 shadow-sm"
            >
              <p className="mb-1 text-sm font-semibold text-red-800">
                ¿Eliminar <span className="font-bold">{cat.label}</span>?
              </p>
              <p className="mb-3 text-xs text-red-600">
                Esta acción no se puede deshacer. Si la categoría tiene líneas asociadas, no podrá eliminarse.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => confirmDelete(cat.key)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => cancelRow(cat.key)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={cat.key}
            className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="w-6 shrink-0 text-center text-xs font-bold text-text-faint">
              {idx + 1}
            </span>

            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                disabled={idx === 0 || anyBusy}
                onClick={() => move(cat.key, "up")}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
                title="Subir"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                disabled={idx === cats.length - 1 || anyBusy}
                onClick={() => move(cat.key, "down")}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
                title="Bajar"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-text-main">{cat.label}</p>
              <p className="font-mono text-xs text-text-faint">{cat.key}</p>
              {cat.description && (
                <p className="mt-0.5 truncate text-xs text-text-muted">{cat.description}</p>
              )}
            </div>

            {moving === cat.key && (
              <span className="text-xs text-text-faint">...</span>
            )}

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => startEdit(cat)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                title="Editar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => setRowMode((prev) => ({ ...prev, [cat.key]: "confirm-delete" }))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                title="Eliminar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {cats.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay categorías creadas aún.{" "}
          <Link href="/admin/categorias/nueva" className="font-semibold text-primary underline">
            Crear la primera
          </Link>
        </p>
      )}
    </div>
  );
}
