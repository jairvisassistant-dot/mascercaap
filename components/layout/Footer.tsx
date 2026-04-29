import Link from "next/link";
import Image from "next/image";
import { SITE_CONFIG } from "@/lib/config";
import BrandFruitMark from "@/components/ui/BrandFruitMark";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const socialLinks = [
  {
    name: "Facebook",
    href: SITE_CONFIG.socialFacebook,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: SITE_CONFIG.socialInstagram,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: SITE_CONFIG.socialTikTok,
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
  },
];

interface FooterProps {
  dict: Dictionary;
  lang: Locale;
}

export default function Footer({ dict, lang }: FooterProps) {
  const footerLinks = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/productos`, label: dict.nav.products },
    { href: `/${lang}/nosotros`, label: dict.nav.about },
    { href: `/${lang}/contacto`, label: dict.nav.contact },
  ];

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <Link href={`/${lang}`} className="flex items-center gap-2 text-2xl font-bold mb-4">
              <Image src="/imgs/Logo.png" alt="Más Cerca AP" width={97} height={60} className="object-contain" style={{ filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.20))", marginRight: "-8px" }} />
              <span className="text-primary">MAS CERCA</span>
              <span className="text-accent">AP</span>
              <BrandFruitMark />
            </Link>
            <p className="text-gray-400 mb-4 max-w-md">
              {dict.footer.description}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => {
                const cls = `w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  index === 1 ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                }`;
                const label = `${dict.footer.socialLabel} ${social.name}`;
                return social.href ? (
                  <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={label}>
                    {social.icon}
                  </a>
                ) : (
                  <span key={social.name} className={cls} aria-label={label}>
                    {social.icon}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">{dict.footer.quickLinks}</h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Product lines */}
          <div>
            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">
              {dict.footer.productsTitle}
            </h3>
            <ul className="space-y-2">
              {(["jugos", "pulpas", "lacteos"] as const).map((category) => (
                <li key={category}>
                  <Link
                    href={`/${lang}/productos?categoria=${category}`}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    {dict.footer.productLines[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">{dict.footer.contact}</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a
                  href={SITE_CONFIG.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-sm"
                >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {dict.footer.location}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE_CONFIG.emailContact}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-sm"
                >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                {SITE_CONFIG.emailContact}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SITE_CONFIG.phoneTel}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-sm"
                >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                {SITE_CONFIG.phoneDisplay}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <Link href={`/${lang}/politicas`} className="text-gray-500 hover:text-primary transition-colors">
            {dict.helpHub.menu.privacy}
          </Link>
          <span className="text-gray-700">·</span>
          <Link href={`/${lang}/terminos`} className="text-gray-500 hover:text-primary transition-colors">
            {dict.helpHub.menu.terms}
          </Link>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>{dict.footer.copyright}</p>
          <p className="mt-2 text-sm">{dict.footer.madeWith}</p>
        </div>
      </div>
    </footer>
  );
}
