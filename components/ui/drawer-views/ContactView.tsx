"use client";

import ContactForm from "@/components/sections/ContactForm";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

export default function ContactView() {
  const { dict } = useDictionary();
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <ContactForm dict={dict} />
    </div>
  );
}
