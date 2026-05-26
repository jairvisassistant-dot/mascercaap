"use client";

import { useState, useEffect, useRef } from "react";
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

const itemCls =
  "flex items-center px-4 py-2.5 text-sm font-medium text-text-sub hover:bg-surface-warm hover:text-primary-dark transition-colors first:rounded-t-2xl last:rounded-b-2xl";

const createActionCls =
  "rounded-xl border border-primary/40 bg-surface-card px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/8 active:translate-y-0";

export default function AdminNavbar({ productCount }: { productCount?: number | null }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const isLoginPage  = pathname === "/admin/login";
  const isCatPage    = pathname === "/admin/categorias";
  const isLineasPage = pathname === "/admin/lineas";

  const isSubPage =
    pathname.startsWith("/admin/productos/") ||
    pathname.startsWith("/admin/categorias/") ||
    pathname.startsWith("/admin/lineas/");

  const backHref = pathname.startsWith("/admin/categorias/")
    ? "/admin/categorias"
    : pathname.startsWith("/admin/lineas/")
    ? "/admin/lineas"
    : "/admin/productos";

  function toggleMenu(id: string) {
    setOpenMenu((prev) => (prev === id ? null : id));
  }

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

          {/* Logo + subtitle */}
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
          <div ref={navRef} className="flex items-center gap-3">
            <ThemeToggle labels={themeLabels} />

            {isLoginPage ? (
              <Link
                href="/es"
                className="rounded-xl border border-border-mid px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark"
              >
                ← Volver al sitio
              </Link>
            ) : (
              <>
                <NavDropdown label="Catálogo" id="catalogo" openMenu={openMenu} onToggle={toggleMenu}>
                  <Link href="/admin/productos/nuevo" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} gap-2 font-semibold text-primary`}>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">+</span>
                    Nuevo producto
                  </Link>
                  <div className="mx-3 my-1 border-t border-border-soft" />
                  <Link href="/admin/productos" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/productos" ? "font-semibold text-primary" : ""}`}>
                    Lista de productos
                  </Link>
                  <Link href="/admin/categorias" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/categorias" ? "font-semibold text-primary" : ""}`}>
                    Categorías
                  </Link>
                  <Link href="/admin/lineas" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/lineas" ? "font-semibold text-primary" : ""}`}>
                    Líneas
                  </Link>
                  <Link href="/admin/imagenes" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/imagenes" ? "font-semibold text-primary" : ""}`}>
                    Imágenes
                  </Link>
                </NavDropdown>

                <NavDropdown label="Operaciones" id="operaciones" openMenu={openMenu} onToggle={toggleMenu}>
                  <Link href="/admin/consultas" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/consultas" ? "font-semibold text-primary" : ""}`}>
                    Consultas
                  </Link>
                  <Link href="/admin/analytics" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/analytics" ? "font-semibold text-primary" : ""}`}>
                    Analytics
                  </Link>
                  <Link href="/admin/faq" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/faq" ? "font-semibold text-primary" : ""}`}>
                    FAQ
                  </Link>
                </NavDropdown>

                <NavDropdown label="Sistema" id="sistema" openMenu={openMenu} onToggle={toggleMenu}>
                  <Link href="/admin/configuracion/seguridad" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/configuracion/seguridad" ? "font-semibold text-primary" : ""}`}>
                    Seguridad
                  </Link>
                  <Link href="/admin/configuracion/csp" onClick={() => setOpenMenu(null)}
                    className={`${itemCls} ${pathname === "/admin/configuracion/csp" ? "font-semibold text-primary" : ""}`}>
                    CSP
                  </Link>
                </NavDropdown>

                {isCatPage && (
                  <Link
                    href="/admin/categorias/nueva"
                    className={createActionCls}
                  >
                    + Nueva categoría
                  </Link>
                )}
                {isLineasPage && (
                  <Link
                    href="/admin/lineas/nueva"
                    className={createActionCls}
                  >
                    + Nueva línea
                  </Link>
                )}
                {isSubPage && (
                  <Link
                    href={backHref}
                    className="rounded-xl border border-border-mid px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark"
                  >
                    ← Volver
                  </Link>
                )}

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

type NavDropdownProps = {
  label: string;
  id: string;
  openMenu: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
};

function NavDropdown({ label, id, openMenu, onToggle, children }: NavDropdownProps) {
  const isOpen = openMenu === id;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary-dark active:translate-y-0"
      >
        {label}
        <span className={`text-[10px] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-2xl border border-border-soft bg-surface-card shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]">
          {children}
        </div>
      )}
    </div>
  );
}
