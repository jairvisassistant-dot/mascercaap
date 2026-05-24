"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";

const CONSENT_KEY = "ga-consent";

interface CookieConsentProps {
  gaId: string | undefined;
  dict: Dictionary;
  lang: Locale;
}

export default function CookieConsent({ gaId, dict, lang }: CookieConsentProps) {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "declined") {
        setConsent(stored as "accepted" | "declined");
      }
    } catch { /* private mode */ }
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch { /* private mode */ }
    setConsent("accepted");
  };

  const decline = () => {
    try { localStorage.setItem(CONSENT_KEY, "declined"); } catch { /* private mode */ }
    setConsent("declined");
  };

  if (!mounted) return null;


  const t = dict.cookieConsent;

  return (
    <>
      {consent === "accepted" && gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
      {consent === null && (
        <div
          role="dialog"
          aria-label={t.dialogLabel}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-2xl border border-border-soft bg-surface-card p-4 shadow-2xl sm:bottom-6 sm:left-6 sm:right-6"
        >
          <p className="text-sm text-text-muted mb-3">
            {t.text}{" "}
            <Link
              href={`/${lang}/politicas`}
              className="text-primary underline underline-offset-2 hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              {t.learnMore}
            </Link>
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={decline}
              className="px-4 py-2 text-sm font-medium text-text-muted rounded-xl border border-border-mid hover:border-primary hover:text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t.decline}
            </button>
            <button
              type="button"
              onClick={accept}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
