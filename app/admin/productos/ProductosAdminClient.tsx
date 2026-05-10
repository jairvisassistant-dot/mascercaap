"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  line: string;
  presentation: string;
  price: number | null;
  image: string | null;
  featured: boolean;
  is_sold_out: boolean;
  is_best_seller: boolean;
  active: boolean;
  display_order: number;
};

const LINE_LABELS: Record<string, string> = {
  limon: "Zumo de Limón",
  "limonada-cereza": "Limonada Cereza",
  "limonada-coco": "Limonada Coco",
  maracuya: "Zumo Maracuyá",
  "pulpa-maracuya": "Pulpa Maracuyá",
  "pulpa-mora": "Pulpa Mora",
  "pulpa-fresa": "Pulpa Fresa",
  "pulpa-mango": "Pulpa Mango",
  "pulpa-guanabana": "Pulpa Guanábana",
  "pulpa-lulo": "Pulpa Lulo",
  "pulpa-guayaba": "Pulpa Guayaba",
  "pulpa-frutos-rojos": "Pulpa Frutos Rojos",
  "pulpa-frutos-amarillos": "Pulpa Frutos Amarillos",
  "pulpa-tomate-arbol": "Pulpa Tomate de Árbol",
  kumiss: "Kumiss / Yogurt",
};

export default function ProductosAdminClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("all");
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  const lines = Array.from(new Set(initialProducts.map((p) => p.line))).sort();

  const filtered = products.filter((p) => {
    const matchesLine = lineFilter === "all" || p.line === lineFilter;
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesLine && matchesSearch;
  });

  async function toggle(id: string, field: "featured" | "is_sold_out" | "is_best_seller" | "active", value: boolean) {
    setError("");

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al actualizar");
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: !value } : p))
      );
      return;
    }

    startTransition(() => router.refresh());
  }

  const featuredCount = products.filter((p) => p.featured).length;

  return (
    <div className="relative mx-auto w-full max-w-[1680px] p-6 lg:px-8">
      {/* Fondo decorativo sutil — consistente con las demás secciones del sitio */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(63,143,70,0.07)_0%,transparent_45%),radial-gradient(circle_at_92%_88%,rgba(229,138,34,0.05)_0%,transparent_40%)]" />

      {error && (
        <div className="relative mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="relative mb-6 flex flex-wrap gap-3 rounded-3xl border border-primary/15 bg-gradient-to-br from-[#f7ffe6]/80 via-surface-card to-surface-card p-4 shadow-[0_20px_60px_-38px_rgba(47,111,54,0.45)]">
        <input
          type="text"
          placeholder="Buscar por nombre o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm text-text-main placeholder:text-text-faint transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={lineFilter}
          onChange={(e) => setLineFilter(e.target.value)}
          className="rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm text-text-main transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todas las líneas</option>
          {lines.map((l) => (
            <option key={l} value={l}>{LINE_LABELS[l] ?? l}</option>
          ))}
        </select>
        <span className="self-center rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent-dark">
          Destacados: <strong className={featuredCount >= 3 ? "text-red-500" : "text-primary-dark"}>{featuredCount}/3</strong>
        </span>
      </div>

      {/* Tabla */}
      <div className="relative overflow-x-auto rounded-3xl border border-primary/12 bg-surface-card shadow-[0_24px_70px_-40px_rgba(47,111,54,0.55)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-[#3a7f45] via-[#438b4d] to-[#347640] text-left text-xs uppercase tracking-[0.18em] text-white/90">
              <th className="w-12 px-4 py-4 font-semibold">Img</th>
              <th className="px-4 py-4 font-semibold">Nombre</th>
              <th className="hidden px-4 py-4 font-semibold md:table-cell">Línea</th>
              <th className="hidden px-4 py-4 font-semibold sm:table-cell">Presentación</th>
              <th className="hidden px-4 py-4 font-semibold text-right sm:table-cell">Precio</th>
              <th className="px-4 py-4 text-center font-semibold">Dest.</th>
              <th className="px-4 py-4 text-center font-semibold">Vendido</th>
              <th className="hidden px-4 py-4 text-center font-semibold sm:table-cell">+ Pedido</th>
              <th className="px-4 py-4 text-center font-semibold">Activo</th>
              <th className="w-16 px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`${p.active ? "bg-surface-card hover:bg-[#f7ffe6]/40" : "bg-surface-warm/55 opacity-60"} transition-colors`}
              >
                <td className="px-4 py-3">
                  {p.image ? (
                    <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-surface-warm ring-1 ring-border-soft">
                      <Image src={p.image} alt={p.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-warm text-xs text-text-faint ring-1 ring-border-soft">
                      ?
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-text-main">{p.name}</p>
                  <p className="text-xs text-text-muted">{p.id}</p>
                </td>
                <td className="hidden px-4 py-3 text-text-sub md:table-cell">
                  {LINE_LABELS[p.line] ?? p.line}
                </td>
                <td className="hidden px-4 py-3 text-text-sub sm:table-cell">{p.presentation}</td>
                <td className="hidden px-4 py-3 text-right font-mono text-sm text-text-main sm:table-cell">
                  {p.price != null ? `$${p.price.toLocaleString("es-CO")}` : <span className="text-text-faint">—</span>}
                </td>

                {/* Toggle: Destacado */}
                <td className="px-4 py-3 text-center">
                  <Toggle
                    value={p.featured}
                    disabled={!p.featured && featuredCount >= 3}
                    title={!p.featured && featuredCount >= 3 ? "Máximo 3 destacados" : ""}
                    onChange={(v) => toggle(p.id, "featured", v)}
                    color="yellow"
                  />
                </td>

                {/* Toggle: Agotado */}
                <td className="px-4 py-3 text-center">
                  <Toggle
                    value={p.is_sold_out}
                    onChange={(v) => toggle(p.id, "is_sold_out", v)}
                    color="red"
                  />
                </td>

                {/* Toggle: Más vendido */}
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <Toggle
                    value={p.is_best_seller}
                    onChange={(v) => toggle(p.id, "is_best_seller", v)}
                    color="blue"
                  />
                </td>

                {/* Toggle: Activo */}
                <td className="px-4 py-3 text-center">
                  <Toggle
                    value={p.active}
                    onChange={(v) => toggle(p.id, "active", v)}
                    color="green"
                  />
                </td>

                <td className="px-4 py-3">
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="rounded-lg border border-border-mid px-2.5 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-text-muted">Sin resultados</p>
        )}
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  color,
  disabled = false,
  title = "",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  color: "green" | "yellow" | "red" | "blue";
  disabled?: boolean;
  title?: string;
}) {
  const colors = {
    green: "bg-primary",
    yellow: "bg-accent",
    red: "bg-red-500",
    blue: "bg-primary-dark",
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-card ${
        value ? colors[color] : "bg-border-mid"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}
