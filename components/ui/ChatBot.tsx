"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import ChatBotPanel from "./ChatBotPanel";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const { dict } = useDictionary();
  const t = dict.chatbot;

  return (
    <div className="fixed bottom-[5.5rem] right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <ChatBotPanel onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>

      <m.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? t.ariaClose : t.ariaOpen}
        aria-expanded={isOpen}
        className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-white"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <m.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </m.svg>
          ) : (
            <m.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </m.svg>
          )}
        </AnimatePresence>
      </m.button>
    </div>
  );
}
