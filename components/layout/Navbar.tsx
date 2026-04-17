"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { dict, lang } = useDictionary();

  const navLinks = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/productos`, label: dict.nav.products },
    { href: `/${lang}/nosotros`, label: dict.nav.about },
    { href: `/${lang}/contacto`, label: dict.nav.contact },
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isActive = (href: string) => {
    if (href === `/${lang}`) return pathname === `/${lang}` || pathname === `/${lang}/`;
    return pathname.startsWith(href);
  };

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={`/${lang}`} className="flex items-center gap-2 text-2xl font-bold text-primary">
              <span className="text-3xl">🍋</span>
              <span className="text-primary">MAS CERCA</span>
              <span className="text-accent">AP</span>
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
                      : "text-gray-600 hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA + Language Switcher */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />
              <Link
                href={`/${lang}/contacto`}
                className="bg-accent hover:bg-accent-dark text-white font-semibold py-2 px-6 rounded-full transition-all hover:scale-105"
              >
                {dict.nav.cta}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-primary p-2"
              aria-label={dict.nav.menuAriaLabel}
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
        <motion.div
          initial={false}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          className="md:hidden overflow-hidden bg-white border-t"
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
                    : "text-gray-600 border-transparent hover:text-primary hover:border-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <LanguageSwitcher />
              <Link
                href={`/${lang}/contacto`}
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-accent text-white font-semibold py-3 px-6 rounded-full text-center"
              >
                {dict.nav.cta}
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.header>
    </>
  );
}
