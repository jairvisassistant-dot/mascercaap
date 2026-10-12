export const themeLabels = {
  dark: "Oscuro",
  light: "Claro",
  activateDark: "Activar modo oscuro",
  activateLight: "Activar modo claro",
};

export const itemCls =
  "flex items-center px-4 py-2.5 text-sm font-medium text-text-sub hover:bg-surface-warm hover:text-primary-dark transition-colors first:rounded-t-2xl last:rounded-b-2xl";

export const createActionCls =
  "rounded-xl border border-primary/40 bg-surface-card px-4 py-2.5 text-sm font-semibold text-primary transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary hover:bg-primary/8 active:translate-y-0";

export const backLinkCls =
  "rounded-xl border border-border-mid px-4 py-2.5 text-sm font-semibold text-text-sub transition-colors hover:border-primary-light hover:bg-primary-light/20 hover:text-primary-dark";

export type AdminNavItem = { href: string; label: string };

export const catalogoItems: AdminNavItem[] = [
  { href: "/admin/productos", label: "Lista de productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/lineas", label: "Líneas" },
  { href: "/admin/imagenes", label: "Imágenes" },
];

export const operacionesItems: AdminNavItem[] = [
  { href: "/admin/inbox", label: "Bandeja de chat" },
  { href: "/admin/consultas", label: "Consultas" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/faq", label: "FAQ" },
];

export const sistemaItems: AdminNavItem[] = [
  { href: "/admin/configuracion/seguridad", label: "Seguridad" },
  { href: "/admin/configuracion/csp", label: "CSP" },
];

export function headerCls(isScrolled: boolean): string {
  return isScrolled
    ? "bg-surface-page/90 backdrop-blur-md shadow-sm border-b border-border-soft"
    : "bg-surface-page shadow-md";
}

export function navItemCls(pathname: string, href: string): string {
  return `${itemCls} ${pathname === href ? "font-semibold text-primary" : ""}`;
}

export function isSubPagePath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/productos/") ||
    pathname.startsWith("/admin/categorias/") ||
    pathname.startsWith("/admin/lineas/")
  );
}

export function resolveBackHref(pathname: string): string {
  if (pathname.startsWith("/admin/categorias/")) return "/admin/categorias";
  if (pathname.startsWith("/admin/lineas/")) return "/admin/lineas";
  return "/admin/productos";
}
