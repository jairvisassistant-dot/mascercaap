"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Line = {
  key: string;
  label: string;
  icon_emoji: string;
  description: string;
  category_key: string | null;
  display_order: number;
};

type Category = { key: string; label: string };
type Mode = "view" | "edit" | "confirm-delete";

type EditValues = {
  label: string;
  icon_emoji: string;
  description: string;
  category_key: string | null;
};

export default function LineasList({ initial, categories }: { initial: Line[]; categories: Category[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(initial);
  const [moving, setMoving] = useState<string | null>(null);
  const [rowMode, setRowMode] = useState<Record<string, Mode>>({});
  const [editValues, setEditValues] = useState<Record<string, EditValues>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const getMode = (key: string): Mode => rowMode[key] ?? "view";
  const anyBusy = busy !== null || moving !== null;

  const catLabel = (key: string | null) =>
    key ? (categories.find((c) => c.key === key)?.label ?? key) : "Sin categoría";

  function startEdit(line: Line) {
    setEditValues((prev) => ({
      ...prev,
      [line.key]: {
        label: line.label,
        icon_emoji: line.icon_emoji,
        description: line.description ?? "",
        category_key: line.category_key,
      },
    }));
    setRowMode((prev) => ({ ...prev, [line.key]: "edit" }));
    setError("");
  }

  function cancelRow(key: string) {
    setRowMode((prev) => ({ ...prev, [key]: "view" }));
  }

  function setEdit(key: string, patch: Partial<EditValues>) {
    setEditValues((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function move(key: string, direction: "up" | "down") {
    setMoving(key);
    setError("");

    const idx = lines.findIndex((l) => l.key === key);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lines.length) { setMoving(null); return; }

    const next = [...lines];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setLines(next);

    const res = await fetch("/api/admin/product-lines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, direction }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al reordenar");
      setLines(initial);
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

    const res = await fetch("/api/admin/product-lines", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        label: vals.label.trim(),
        icon_emoji: vals.icon_emoji.trim() || "🛍️",
        description: vals.description.trim(),
        category_key: vals.category_key || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
    } else {
      setLines((prev) =>
        prev.map((l) =>
          l.key === key
            ? { ...l, label: vals.label.trim(), icon_emoji: vals.icon_emoji.trim() || "🛍️", description: vals.description.trim(), category_key: vals.category_key || null }
            : l
        )
      );
      setRowMode((prev) => ({ ...prev, [key]: "view" }));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  async function confirmDelete(key: string) {
    setBusy(key);
    setError("");

    const res = await fetch("/api/admin/product-lines", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al eliminar");
      setRowMode((prev) => ({ ...prev, [key]: "view" }));
    } else {
      setLines((prev) => prev.filter((l) => l.key !== key));
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  // Agrupar por categoría para mostrar
  const groups = categories.map((cat) => ({
    cat,
    lines: lines.filter((l) => l.category_key === cat.key),
  }));
  const uncategorized = lines.filter((l) => !l.category_key);

  return (
    <div className="w-full max-w-3xl space-y-6">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-text-sub">
        Las flechas ↑↓ mueven la línea en el orden global (afecta la página de productos). El orden dentro de una categoría es relativo a las demás líneas del catálogo completo.
      </p>

      {groups.map(({ cat, lines: groupLines }) =>
        groupLines.length > 0 ? (
          <div key={cat.key}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-dark">
              {cat.label}
            </h2>
            <div className="space-y-2">
              {groupLines.map((line) => {
                const globalIdx = lines.findIndex((l) => l.key === line.key);
                return (
                  <LineRow
                    key={line.key}
                    line={line}
                    globalIdx={globalIdx}
                    total={lines.length}
                    mode={getMode(line.key)}
                    editVals={editValues[line.key]}
                    categories={categories}
                    moving={moving}
                    busy={busy}
                    anyBusy={anyBusy}
                    onMove={move}
                    onStartEdit={startEdit}
                    onCancelRow={cancelRow}
                    onSetEdit={setEdit}
                    onSaveEdit={saveEdit}
                    onConfirmDelete={confirmDelete}
                    onRequestDelete={(key) => setRowMode((prev) => ({ ...prev, [key]: "confirm-delete" }))}
                  />
                );
              })}
            </div>
          </div>
        ) : null
      )}

      {uncategorized.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-text-faint">
            Sin categoría
          </h2>
          <div className="space-y-2">
            {uncategorized.map((line) => {
              const globalIdx = lines.findIndex((l) => l.key === line.key);
              return (
                <LineRow
                  key={line.key}
                  line={line}
                  globalIdx={globalIdx}
                  total={lines.length}
                  mode={getMode(line.key)}
                  editVals={editValues[line.key]}
                  categories={categories}
                  moving={moving}
                  busy={busy}
                  anyBusy={anyBusy}
                  onMove={move}
                  onStartEdit={startEdit}
                  onCancelRow={cancelRow}
                  onSetEdit={setEdit}
                  onSaveEdit={saveEdit}
                  onConfirmDelete={confirmDelete}
                  onRequestDelete={(key) => setRowMode((prev) => ({ ...prev, [key]: "confirm-delete" }))}
                />
              );
            })}
          </div>
        </div>
      )}

      {lines.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay líneas creadas aún.{" "}
          <Link href="/admin/lineas/nueva" className="font-semibold text-primary underline">
            Crear la primera
          </Link>
        </p>
      )}
    </div>
  );
}

function LineRow({
  line, globalIdx, total, mode, editVals, categories,
  moving, busy, anyBusy,
  onMove, onStartEdit, onCancelRow, onSetEdit, onSaveEdit, onConfirmDelete, onRequestDelete,
}: {
  line: Line;
  globalIdx: number;
  total: number;
  mode: Mode;
  editVals: EditValues | undefined;
  categories: Category[];
  moving: string | null;
  busy: string | null;
  anyBusy: boolean;
  onMove: (key: string, dir: "up" | "down") => void;
  onStartEdit: (line: Line) => void;
  onCancelRow: (key: string) => void;
  onSetEdit: (key: string, patch: Partial<EditValues>) => void;
  onSaveEdit: (key: string) => void;
  onConfirmDelete: (key: string) => void;
  onRequestDelete: (key: string) => void;
}) {
  const isBusy = busy === line.key || moving === line.key;

  if (mode === "edit") {
    const vals = editVals ?? { label: line.label, icon_emoji: line.icon_emoji, description: line.description ?? "", category_key: line.category_key };
    return (
      <div className="rounded-2xl border border-primary/40 bg-surface-card px-4 py-4 shadow-sm ring-1 ring-primary/15">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          Editando · <span className="font-mono normal-case tracking-normal text-text-faint">{line.key}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${line.key}-nombre`} className="mb-1 block text-xs font-semibold text-text-sub">Nombre *</label>
            <input
              id={`${line.key}-nombre`}
              type="text"
              autoFocus
              value={vals.label}
              onChange={(e) => onSetEdit(line.key, { label: e.target.value })}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor={`${line.key}-emoji`} className="mb-1 block text-xs font-semibold text-text-sub">Emoji</label>
            <input
              id={`${line.key}-emoji`}
              type="text"
              value={vals.icon_emoji}
              onChange={(e) => onSetEdit(line.key, { icon_emoji: e.target.value })}
              maxLength={4}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor={`${line.key}-categoria`} className="mb-1 block text-xs font-semibold text-text-sub">Categoría</label>
            <select
              id={`${line.key}-categoria`}
              value={vals.category_key ?? ""}
              onChange={(e) => onSetEdit(line.key, { category_key: e.target.value || null })}
              className="w-full rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${line.key}-descripcion`} className="mb-1 block text-xs font-semibold text-text-sub">Descripción</label>
            <textarea
              id={`${line.key}-descripcion`}
              value={vals.description}
              onChange={(e) => onSetEdit(line.key, { description: e.target.value })}
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-border-mid bg-surface-page px-3 py-2 text-sm text-text-main focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy || !vals.label.trim()}
            onClick={() => onSaveEdit(line.key)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onCancelRow(line.key)}
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
      <div className="rounded-2xl border border-red-200 bg-red-50/60 px-4 py-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-red-800">
          ¿Eliminar <span className="font-bold">{line.label}</span>?
        </p>
        <p className="mb-3 text-xs text-red-600">
          Solo se puede eliminar si la línea no tiene productos activos. Esta acción no se puede deshacer.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onConfirmDelete(line.key)}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy ? "Eliminando…" : "Sí, eliminar"}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onCancelRow(line.key)}
            className="rounded-xl px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-soft bg-surface-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
      <span className="w-6 shrink-0 text-center text-xs font-bold text-text-faint">
        {globalIdx + 1}
      </span>

      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={globalIdx === 0 || anyBusy}
          onClick={() => onMove(line.key, "up")}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
          title="Subir"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          disabled={globalIdx === total - 1 || anyBusy}
          onClick={() => onMove(line.key, "down")}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-25"
          title="Bajar"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <span className="text-xl">{line.icon_emoji}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text-main">{line.label}</p>
        <p className="font-mono text-xs text-text-faint">{line.key}</p>
      </div>

      {moving === line.key && (
        <span className="text-xs text-text-faint">...</span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={anyBusy}
          onClick={() => onStartEdit(line)}
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
          onClick={() => onRequestDelete(line.key)}
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
}
