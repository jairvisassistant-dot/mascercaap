"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  backLinkCls,
  catalogoItems,
  createActionCls,
  itemCls,
  navItemCls,
  operacionesItems,
  sistemaItems,
  themeLabels,
  isSubPagePath,
  resolveBackHref,
} from "./admin-nav-config";

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
        className="flex items-center gap-1 rounded-xl border border-border-mid bg-surface-card px-4 py-2.5 text-sm font-semibold text-text-sub transition-[transform,border-color,color] hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary-dark active:translate-y-0"
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

type Props = {
  pathname: string;
  isLoginPage: boolean;
  openMenu: string | null;
  onToggleMenu: (id: string) => void;
  onNavigate: () => void;
};

export function AdminNavActions({
  pathname,
  isLoginPage,
  openMenu,
  onToggleMenu,
  onNavigate,
}: Props) {
  if (isLoginPage) {
    return (
      <>
        <ThemeToggle labels={themeLabels} />
        <Link href="/es" className={backLinkCls}>
          ← Volver al sitio
        </Link>
      </>
    );
  }

  const isCatPage = pathname === "/admin/categorias";
  const isLineasPage = pathname === "/admin/lineas";
  const isSubPage = isSubPagePath(pathname);

  return (
    <>
      <ThemeToggle labels={themeLabels} />

      <NavDropdown label="Catálogo" id="catalogo" openMenu={openMenu} onToggle={onToggleMenu}>
        <Link href="/admin/productos/nuevo" onClick={onNavigate}
          className={`${itemCls} gap-2 font-semibold text-primary`}>
          <span className="flex size-4 items-center justify-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">+</span>
          Nuevo producto
        </Link>
        <div className="mx-3 my-1 border-t border-border-soft" />
        {catalogoItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemCls(pathname, item.href)}>
            {item.label}
          </Link>
        ))}
      </NavDropdown>

      <NavDropdown label="Operaciones" id="operaciones" openMenu={openMenu} onToggle={onToggleMenu}>
        {operacionesItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemCls(pathname, item.href)}>
            {item.label}
          </Link>
        ))}
      </NavDropdown>

      <NavDropdown label="Sistema" id="sistema" openMenu={openMenu} onToggle={onToggleMenu}>
        {sistemaItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemCls(pathname, item.href)}>
            {item.label}
          </Link>
        ))}
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
          href={resolveBackHref(pathname)}
          className={backLinkCls}
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
  );
}
