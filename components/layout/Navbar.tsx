"use client";

import { useState, useEffect } from "react";
import { m } from "framer-motion";
// m solo se usa para el menú mobile animado — el header no usa animaciones
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { useHelpHub } from "@/lib/help-hub-context";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BrandFruitMark from "@/components/ui/BrandFruitMark";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { dict, lang } = useDictionary();
  const { openDrawer } = useHelpHub();

  const navLinks = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/productos`, label: dict.nav.products },
    { href: `/${lang}/nosotros`, label: dict.nav.about },
    { href: `/${lang}/contacto`, label: dict.nav.contact },
  ];

  const themeLabels = {
    dark: dict.nav.themeDark,
    light: dict.nav.themeLight,
    activateDark: dict.nav.themeActivateDark,
    activateLight: dict.nav.themeActivateLight,
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === `/${lang}`) return pathname === `/${lang}` || pathname === `/${lang}/`;
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-surface-page/90 backdrop-blur-md shadow-sm border-b border-border-soft"
          : "bg-surface-page shadow-md"
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={`/${lang}`} className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Image src="/imgs/Logo.webp" alt="Más Cerca AP" width={97} height={60} priority className="object-contain" style={{ filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.20))", marginRight: "-8px" }} />
              <span className="text-primary">MAS CERCA</span>
              <span className="text-accent">AP</span>
              <BrandFruitMark />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-primary nav-link-active"
                      : "text-text-muted hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA + Language Switcher + Theme Toggle */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle labels={themeLabels} />
              <LanguageSwitcher dict={dict} lang={lang} />
              <button
                onClick={() => openDrawer("faq")}
                className="bg-accent hover:bg-accent-dark text-white font-semibold py-2 px-6 rounded-full transition-all hover:scale-105"
              >
                {dict.nav.cta}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-primary p-2"
              aria-label={dict.nav.menuAriaLabel}
              aria-expanded={isOpen}
              aria-controls="mobile-nav"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <m.div
          id="mobile-nav"
          initial={false}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          aria-hidden={!isOpen}
          {...(!isOpen ? { inert: true } : {})}
          className="md:hidden overflow-hidden bg-surface-page border-t border-border-soft"
          style={{ pointerEvents: isOpen ? "auto" : "none" }}
        >
          <div className="px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block font-medium py-2 border-l-2 pl-3 transition-colors ${
                  isActive(link.href)
                    ? "text-primary border-accent"
                    : "text-text-muted border-transparent hover:text-primary hover:border-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <ThemeToggle labels={themeLabels} />
              <LanguageSwitcher dict={dict} lang={lang} />
              <button
                onClick={() => { setIsOpen(false); openDrawer("faq"); }}
                className="flex-1 bg-accent text-white font-semibold py-3 px-6 rounded-full text-center"
              >
                {dict.nav.cta}
              </button>
            </div>
          </div>
        </m.div>
      </header>
    </>
  );
}
