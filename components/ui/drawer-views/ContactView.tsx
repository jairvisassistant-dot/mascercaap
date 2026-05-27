"use client";

import ContactForm from "@/components/sections/ContactForm";
import type { Dictionary, Locale } from "@/lib/i18n";

export default function ContactView({ dict, lang }: { dict: Dictionary; lang: Locale }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <ContactForm dict={dict} lang={lang} />
    </div>
  );
}
