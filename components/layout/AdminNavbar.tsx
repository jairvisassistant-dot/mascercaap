"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandFruitMark from "@/components/ui/BrandFruitMark";

const themeLabels = {
  dark: "Oscuro",
  light: "Claro",
  activateDark: "Activar modo oscuro",
  activateLight: "Activar modo claro",
};

export default function AdminNavbar({ productCount }: { productCount?: number | null }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLoginPage   = pathname === "/admin/login";
  const isListPage    = pathname === "/admin/productos";
  const isOrderPage   = pathname === "/admin/categorias" || pathname === "/admin/lineas";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-surface-page/90 backdrop-blur-md shadow-sm border-b border-border-soft"
          : "bg-surface-page shadow-md"
      }`}
    >
      <div className="mx-auto max-w-[1680px] px-4 py-4">
        <div className="flex items-center justify-between gap-4">

          {/* Logo + subtítulo (subtítulo solo cuando estamos dentro del catálogo) */}
          <div className="flex items-center gap-3">
            <Link
              href={isLoginPage ? "/admin/login" : "/admin/productos"}
              className="flex items-center gap-2 text-2xl font-bold text-primary"
            >
              <Image
                src="/imgs/Logo.webp"
                alt="Más Cerca AP"
                width={97}
                height={60}
                priority
                className="object-contain"
                style={{ filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.20))", marginRight: "-8px" }}
              />
              <span className="text-primary whitespace-nowrap">MAS CERCA</span>
              <span className="text-accent">AP</span>
              <BrandFruitMark />
              <span className="ml-1 rounded-full border border-border-soft bg-surface-warm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Admin
              </span>
            </Link>
            {!isLoginPage && (
              <div className="hidden border-l border-border-soft pl-3 md:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-dark">
                  Catálogo interno
                </p>
                {productCount != null && (
                  <p className="text-xs text-text-muted">
                    {productCount} producto{productCount !== 1 ? "s" : ""} en total
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle labels={themeLabels} />

            {isLoginPage ? (
              <Link
                href="/es"
                className="rounded-xl border border-border-mid px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark"
              >
                ← Volver al sitio
              </Link>
            ) : isListPage ? (
              <>
                <Link
                  href="/admin/categorias"
                  className="rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary-dark active:translate-y-0"
                >
                  Categorías
                </Link>
                <Link
                  href="/admin/lineas"
                  className="rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary-dark active:translate-y-0"
                >
                  Líneas
                </Link>
                <Link
                  href="/admin/productos/nuevo"
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(63,143,70,0.85)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
                >
                  + Nuevo producto
                </Link>
                <form action="/api/admin/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                  >
                    Salir
                  </button>
                </form>
              </>
            ) : isOrderPage ? (
              <>
                <Link
                  href="/admin/categorias/nueva"
                  className="rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary-dark active:translate-y-0"
                >
                  + Nueva categoría
                </Link>
                <Link
                  href="/admin/lineas/nueva"
                  className="rounded-xl border border-primary/40 bg-surface-card px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/8 active:translate-y-0"
                >
                  + Nueva línea
                </Link>
                <Link
                  href="/admin/productos"
                  className="rounded-xl border border-border-mid px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark"
                >
                  ← Volver
                </Link>
                <form action="/api/admin/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                  >
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/admin/productos"
                  className="rounded-xl border border-border-mid px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark"
                >
                  ← Volver
                </Link>
                <form action="/api/admin/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-xl px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-warm hover:text-text-main"
                  >
                    Salir
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
