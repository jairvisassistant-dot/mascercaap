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
    <div className="p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
        />
        <select
          value={lineFilter}
          onChange={(e) => setLineFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Todas las líneas</option>
          {lines.map((l) => (
            <option key={l} value={l}>{LINE_LABELS[l] ?? l}</option>
          ))}
        </select>
        <span className="text-gray-400 text-sm self-center">
          Destacados: <strong className={featuredCount >= 3 ? "text-yellow-400" : "text-white"}>{featuredCount}/3</strong>
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium w-12">Img</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Línea</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Presentación</th>
              <th className="px-4 py-3 font-medium text-center">Dest.</th>
              <th className="px-4 py-3 font-medium text-center">Vendido</th>
              <th className="px-4 py-3 font-medium text-center hidden sm:table-cell">+ Pedido</th>
              <th className="px-4 py-3 font-medium text-center">Activo</th>
              <th className="px-4 py-3 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`${p.active ? "bg-gray-950 hover:bg-gray-900" : "bg-gray-950/50 opacity-50"} transition-colors`}
              >
                <td className="px-4 py-3">
                  {p.image ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                      <Image src={p.image} alt={p.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                      ?
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.id}</p>
                </td>
                <td className="px-4 py-3 text-gray-300 hidden md:table-cell">
                  {LINE_LABELS[p.line] ?? p.line}
                </td>
                <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">{p.presentation}</td>

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
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded transition-colors"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-12">Sin resultados</p>
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
    green: "bg-green-500",
    yellow: "bg-yellow-400",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        value ? colors[color] : "bg-gray-700"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}
