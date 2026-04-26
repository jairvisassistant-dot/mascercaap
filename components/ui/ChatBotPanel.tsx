"use client";

import { useState, useRef, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { faqData } from "@/data/faq";
import { findAnswer } from "@/lib/faq-matcher";
import { SITE_CONFIG } from "@/lib/config";
import type { Locale } from "@/lib/i18n";

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
};

type ChatBotPanelProps = {
  onClose: () => void;
};

export default function ChatBotPanel({ onClose }: ChatBotPanelProps) {
  const { dict, lang } = useDictionary();
  const locale = lang as Locale;
  const t = dict.chatbot;

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: t.welcome },
  ]);
  const [view, setView] = useState<"categories" | "questions">("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss feedback after 15s if user doesn't interact (UX-01)
  useEffect(() => {
    if (!showFeedback) return;
    const timer = setTimeout(() => setShowFeedback(null), 15_000);
    return () => clearTimeout(timer);
  }, [showFeedback]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(role: "bot" | "user", text: string): string {
    const id = `msg-${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, role, text }]);
    return id;
  }

  function handleCategoryClick(categoryId: string) {
    const category = faqData.categories.find((c) => c.id === categoryId);
    if (!category) return;
    addMessage("user", category.label[locale]);
    setSelectedCategoryId(categoryId);
    setView("questions");
  }

  function handleQuestionClick(questionId: string) {
    const category = faqData.categories.find((c) => c.id === selectedCategoryId);
    const question = category?.questions.find((q) => q.id === questionId);
    if (!question) return;
    addMessage("user", question.question[locale]);
    const botMsgId = `bot-${questionId}`;
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: "bot", text: question.answer[locale] },
    ]);
    setShowFeedback(botMsgId);
  }

  function handleBackToCategories() {
    setView("categories");
    setSelectedCategoryId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    setInput("");
    addMessage("user", query);

    const match = findAnswer(query);
    if (match) {
      const botMsgId = `bot-search-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, role: "bot", text: match.question.answer[locale] },
      ]);
      setShowFeedback(botMsgId);
    } else {
      const botMsgId = `bot-fallback-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, role: "bot", text: t.fallback },
      ]);
      setShowFeedback(botMsgId);
    }
    setView("categories");
    setSelectedCategoryId(null);
  }

  function handleFeedback(helpful: boolean) {
    setShowFeedback(null);
    if (!helpful) {
      addMessage("bot", t.notHelpful);
    } else {
      addMessage("bot", t.thankYou);
    }
  }

  const whatsappUrl = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(dict.whatsapp.message)}`;

  const selectedCategory = selectedCategoryId
    ? faqData.categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col w-[calc(100vw-2rem)] sm:w-[380px] max-h-[500px] rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-100"
      style={{ transformOrigin: "bottom right" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
            🤖
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">{t.title}</p>
            <p className="text-xs text-white/70 mt-0.5">Más Cerca AP</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={t.ariaClose}
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
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
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug ${
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

        {/* Feedback buttons after last bot message */}
        <AnimatePresence>
          {showFeedback && (
            <m.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 pl-1"
            >
              <span className="text-xs text-gray-500">{t.helpful}</span>
              <button
                onClick={() => handleFeedback(true)}
                className="text-xs px-2 py-1 rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
              >
                {t.yes}
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {t.no}
              </button>
            </m.div>
          )}
        </AnimatePresence>

        {/* WhatsApp fallback button — shown after fallback message */}
        <AnimatePresence>
          {messages[messages.length - 1]?.text === t.fallback && (
            <m.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start pl-1"
            >
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t.talkToHuman}
              </a>
            </m.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Category / Question chips */}
      <div className="px-3 py-2 bg-white border-t border-gray-100">
        <AnimatePresence mode="wait">
          {view === "categories" ? (
            <m.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-xs text-gray-400 mb-2">{t.categories}</p>
              <div className="flex flex-wrap gap-1.5">
                {faqData.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary transition-colors"
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
                onClick={handleBackToCategories}
                className="text-xs text-primary hover:underline mb-2 flex items-center gap-1"
              >
                {t.backToCategories}
              </button>
              <div className="flex flex-col gap-1">
                {selectedCategory?.questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQuestionClick(q.id)}
                    className="text-left text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary transition-colors"
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
      <form onSubmit={handleSubmit} className="px-3 py-2 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <label htmlFor="chatbot-input" className="sr-only">
            {t.inputLabel}
          </label>
          <input
            id="chatbot-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 text-sm px-3 py-2 rounded-full border border-gray-200 outline-none focus:border-primary transition-colors bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-primary disabled:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            aria-label={t.sendAriaLabel}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </m.div>
  );
}
