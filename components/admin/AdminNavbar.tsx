"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import BrandFruitMark from "@/components/ui/BrandFruitMark";
import { AdminNavActions } from "./AdminNavActions";
import { headerCls } from "./admin-nav-config";

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

  const isLoginPage = pathname === "/admin/login";

  function toggleMenu(id: string) {
    setOpenMenu((prev) => (prev === id ? null : id));
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[box-shadow,backdrop-filter,border-color,background-color] duration-300 ${headerCls(isScrolled)}`}
    >
      <div className="mx-auto max-w-[1680px] p-4">
        <div className="flex items-center justify-between gap-4">

          {/* Logo + subtitle */}
          <div className="flex items-center gap-3">
            <Link
              href={isLoginPage ? "/admin/login" : "/admin/productos"}
              className="flex items-center gap-2 text-2xl font-bold text-primary"
            >
              <Image
                src="/imgs/Logo.webp"
                alt="Mas Cerca AP"
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
            <AdminNavActions
              pathname={pathname}
              isLoginPage={isLoginPage}
              openMenu={openMenu}
              onToggleMenu={toggleMenu}
              onNavigate={() => setOpenMenu(null)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
