"use client";

import { useState, useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { faqData } from "@/data/faq";
import { findAnswer } from "@/lib/faq-matcher";
import { SITE_CONFIG } from "@/lib/config";
import type { Locale } from "@/lib/i18n";

type Message = { id: string; role: "bot" | "user"; text: string };
type ChatView = "categories" | "questions";

type Props = { onContactClick: () => void };

export default function FaqView({ onContactClick }: Props) {
  const { dict, lang } = useDictionary();
  const locale = lang as Locale;
  const t = dict.chatbot;
  const th = dict.helpHub;

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: t.welcome },
  ]);
  const [chatView, setChatView] = useState<ChatView>("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showFallbackActions, setShowFallbackActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(role: "bot" | "user", text: string) {
    const id = `msg-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, role, text }]);
  }

  function handleCategoryClick(categoryId: string) {
    const category = faqData.categories.find((c) => c.id === categoryId);
    if (!category) return;
    addMessage("user", category.label[locale]);
    setSelectedCategoryId(categoryId);
    setChatView("questions");
    setShowFallbackActions(false);
  }

  function handleQuestionClick(questionId: string) {
    const category = faqData.categories.find((c) => c.id === selectedCategoryId);
    const question = category?.questions.find((q) => q.id === questionId);
    if (!question) return;
    addMessage("user", question.question[locale]);
    addMessage("bot", question.answer[locale]);
    setShowFallbackActions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    setInput("");
    addMessage("user", query);

    const match = findAnswer(query);
    if (match) {
      addMessage("bot", match.question.answer[locale]);
      setShowFallbackActions(false);
    } else {
      addMessage("bot", t.fallback);
      setShowFallbackActions(true);
    }
    setChatView("categories");
    setSelectedCategoryId(null);
  }

  const whatsappUrl = SITE_CONFIG.whatsappNumber
    ? `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(dict.whatsapp.message)}`
    : "#";

  const selectedCategory = selectedCategoryId
    ? faqData.categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <m.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </m.div>
          ))}
        </AnimatePresence>

        {/* Fallback actions */}
        <AnimatePresence>
          {showFallbackActions && (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2 pl-1"
            >
              <p className="text-xs text-gray-500 font-medium">{th.contactOptions}</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium w-fit"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {th.menu.whatsapp}
              </a>
              <button
                onClick={onContactClick}
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary hover:text-white transition-colors font-medium w-fit"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {th.menu.contact}
              </button>
            </m.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Category / Question chips */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <AnimatePresence mode="wait">
          {chatView === "categories" ? (
            <m.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-xs text-gray-400 mb-2">{t.categories}</p>
              <div className="flex flex-wrap gap-2">
                {faqData.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary transition-colors"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label[locale]}</span>
                  </button>
                ))}
              </div>
            </m.div>
          ) : (
            <m.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={() => { setChatView("categories"); setSelectedCategoryId(null); }}
                className="text-xs text-primary hover:underline mb-2 flex items-center gap-1"
              >
                ← {t.backToCategories}
              </button>
              <div className="flex flex-col gap-1.5">
                {selectedCategory?.questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionClick(q.id)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary transition-colors"
                  >
                    {q.question[locale]}
                  </button>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <label htmlFor="faq-input" className="sr-only">{t.inputLabel}</label>
          <input
            id="faq-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 text-sm px-4 py-2.5 rounded-full border border-gray-200 outline-none focus:border-primary transition-colors bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-primary disabled:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            aria-label={t.sendAriaLabel}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
