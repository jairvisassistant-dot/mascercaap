"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import { useHelpHub } from "@/lib/help-hub-context";
import { faqData } from "@/data/faq";
import { findAnswer } from "@/lib/faq-matcher";
import { SITE_CONFIG } from "@/lib/config";
import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Locale } from "@/lib/i18n";

type Message = { id: string; role: "bot" | "user"; text: string };
type ChatView = "categories" | "questions";
type LeadTipo = "pedido" | "negocio" | "consulta";
type LeadData = { nombre: string; email: string; tipo: LeadTipo | "" };

type Props = {
  onContactClick: () => void;
  onWhatsAppConnect: (appUrl: string | null, webUrl: string | null, leadSaved: boolean) => void;
};

const WA_ICON = (
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
);

export default function FaqView({ onContactClick, onWhatsAppConnect }: Props) {
  const { dict, lang } = useDictionary();
  const { drawerContext } = useHelpHub();
  const locale = lang as Locale;
  const t = dict.chatbot;
  const th = dict.helpHub;

  const welcomeText = drawerContext?.product
    ? th.contextGreeting.replace("{product}", drawerContext.product)
    : t.welcome;

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", text: welcomeText },
  ]);
  const [chatView, setChatView] = useState<ChatView>("categories");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showFallbackActions, setShowFallbackActions] = useState(false);
  const [showAdvisorButton, setShowAdvisorButton] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState<LeadData>({ nombre: "", email: "", tipo: "" });
  const [leadConsent, setLeadConsent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextMessageIdRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showLeadForm]);

  function addMessage(role: "bot" | "user", text: string) {
    nextMessageIdRef.current += 1;
    setMessages((prev) => [...prev, { id: `msg-${nextMessageIdRef.current}`, role, text }]);
  }

  function buildWhatsAppUrl(currentMessages: Message[], lead?: Partial<LeadData>): string | null {
    if (!SITE_CONFIG.whatsappNumber) return null;
    const lines: string[] = ["Hola! Vine del chatbot de su página web."];

    if (lead?.nombre) lines.push(`\nNombre: *${lead.nombre}*`);
    if (lead?.email) lines.push(`\nEmail: ${lead.email}`);
    if (lead?.tipo) {
      const label: Record<LeadTipo, string> = {
        pedido: "Quiero hacer un pedido",
        negocio: "Tengo un negocio (mayoreo / distribución)",
        consulta: "Consulta general",
      };
      lines.push(`\nMotivo: ${label[lead.tipo as LeadTipo] ?? lead.tipo}`);
    }
    if (drawerContext?.product) lines.push(`\nProducto de interés: *${drawerContext.product}*`);

    const conversation = currentMessages
      .filter((m) => m.id !== "welcome")
      .map((m) =>
        m.role === "user"
          ? `Yo: "${m.text}"`
          : `Bot: "${m.text.length > 120 ? m.text.slice(0, 120) + "…" : m.text}"`
      )
      .join("\n");

    if (conversation) lines.push(`\nConversación:\n${conversation}`);
    lines.push("\n¿Me pueden ayudar?");
    return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join(""))}`;
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
    setShowAdvisorButton(true);
  }

  function isAdvisorIntent(query: string): boolean {
    const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const patterns = [
      /asesor/, /hablar con/, /hablar a /, /persona real/, /humano/, /agente/,
      /whatsapp/, /llamar/, /contactar/, /necesito ayuda/, /ayuda directa/,
      /talk to/, /speak with/, /human agent/, /advisor/,
    ];
    return patterns.some((p) => p.test(q));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    setInput("");
    addMessage("user", query);

    if (isAdvisorIntent(query)) {
      handleAdvisorClick();
      setChatView("categories");
      setSelectedCategoryId(null);
      return;
    }

    const match = findAnswer(query);
    if (match) {
      addMessage("bot", match.question.answer[locale]);
      setShowFallbackActions(false);
      setShowAdvisorButton(true);
    } else {
      addMessage("bot", t.fallback);
      setShowFallbackActions(true);
      setShowAdvisorButton(false);
    }
    setChatView("categories");
    setSelectedCategoryId(null);
  }

  function handleAdvisorClick() {
    addMessage("bot", t.leadFormIntro);
    setShowLeadForm(true);
    setShowAdvisorButton(false);
    setShowFallbackActions(false);
  }

  function buildConnectUrls(waUrl: string | null) {
    const webUrl = waUrl && SITE_CONFIG.whatsappNumber
      ? `https://web.whatsapp.com/send?phone=${SITE_CONFIG.whatsappNumber}&text=${waUrl.split("?text=")[1] ?? ""}`
      : null;
    return { appUrl: waUrl, webUrl };
  }

  function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadConsent || !leadData.nombre.trim() || !leadData.tipo) return;

    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: leadData.nombre.trim(),
        email: leadData.email.trim() || null,
        tipo: leadData.tipo,
        producto_interes: drawerContext?.product ?? null,
        preguntas_bot: messages
          .filter((m) => m.role === "user" && m.id !== "welcome")
          .map((m) => m.text),
      }),
    });

    const { appUrl, webUrl } = buildConnectUrls(buildWhatsAppUrl(messages, leadData));
    setShowLeadForm(false);
    onWhatsAppConnect(appUrl, webUrl, true);
  }

  function handleLeadSkip() {
    const { appUrl, webUrl } = buildConnectUrls(buildWhatsAppUrl(messages));
    setShowLeadForm(false);
    onWhatsAppConnect(appUrl, webUrl, false);
  }

  const selectedCategory = selectedCategoryId
    ? faqData.categories.find((c) => c.id === selectedCategoryId)
    : null;

  const TIPO_LABELS: Record<LeadTipo, string> = {
    pedido: t.leadTipoPedido,
    negocio: t.leadTipoNegocio,
    consulta: t.leadTipoConsulta,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-soft">
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
                    : "bg-surface-card text-text-sub shadow-sm border border-border-soft rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </m.div>
          ))}
        </AnimatePresence>

        {/* Formulario de captura de lead — inline en el chat */}
        <AnimatePresence>
          {showLeadForm && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-border-mid bg-surface-card shadow-sm p-4 mx-1"
            >
              <form onSubmit={handleLeadSubmit} className="flex flex-col gap-3">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-text-sub mb-1">
                    {t.leadName} <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={leadData.nombre}
                    onChange={(e) => setLeadData((d) => ({ ...d, nombre: e.target.value }))}
                    placeholder={t.leadNamePlaceholder}
                    required
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-text-sub mb-1">
                    {t.leadEmail}
                  </label>
                  <input
                    type="email"
                    value={leadData.email}
                    onChange={(e) => setLeadData((d) => ({ ...d, email: e.target.value }))}
                    placeholder={t.leadEmailPlaceholder}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Tipo de consulta */}
                <div>
                  <p className="text-xs font-semibold text-text-sub mb-2">
                    {t.leadTipo} <span className="text-accent">*</span>
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {(["pedido", "negocio", "consulta"] as LeadTipo[]).map((tipo) => (
                      <label
                        key={tipo}
                        className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          leadData.tipo === tipo
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border-mid text-text-sub hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipo"
                          value={tipo}
                          checked={leadData.tipo === tipo}
                          onChange={() => setLeadData((d) => ({ ...d, tipo }))}
                          className="sr-only"
                        />
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            leadData.tipo === tipo ? "border-primary" : "border-border-mid"
                          }`}
                        >
                          {leadData.tipo === tipo && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary block" />
                          )}
                        </span>
                        {TIPO_LABELS[tipo]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Consentimiento */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={leadConsent}
                    onChange={(e) => setLeadConsent(e.target.checked)}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <span className="text-xs text-text-muted leading-relaxed">
                    {t.leadConsent}{" "}
                    <a
                      href={`/${lang}/politicas`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {t.leadConsentLink}
                    </a>
                  </span>
                </label>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!leadConsent || !leadData.nombre.trim() || !leadData.tipo}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      {WA_ICON}
                    </svg>
                    {t.leadSubmit}
                  </button>
                  <button
                    type="button"
                    onClick={handleLeadSkip}
                    className="text-xs text-text-faint hover:text-text-muted transition-colors px-2 shrink-0"
                  >
                    {t.leadSkip}
                  </button>
                </div>
              </form>
            </m.div>
          )}
        </AnimatePresence>


        {/* Pill de asesor — aparece después de cada respuesta exitosa */}
        <AnimatePresence>
          {showAdvisorButton && !showFallbackActions && !showLeadForm && (
            <m.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 pl-1 pt-1"
            >
              <span className="text-xs text-text-faint">{t.advisorOffer}</span>
              <button
                onClick={handleAdvisorClick}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-colors font-medium shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  {WA_ICON}
                </svg>
                {t.talkToAdvisor}
              </button>
            </m.div>
          )}
        </AnimatePresence>

        {/* Fallback — el bot no sabe responder */}
        <AnimatePresence>
          {showFallbackActions && !showLeadForm && (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-2 pl-1"
            >
              <p className="text-xs text-text-muted font-medium">{th.contactOptions}</p>
              <button
                onClick={handleAdvisorClick}
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium w-fit"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  {WA_ICON}
                </svg>
                {th.menu.whatsapp}
              </button>
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

      {/* Chips de categorías / preguntas */}
      <div className="px-4 py-3 bg-surface-card border-t border-border-soft">
        <AnimatePresence mode="wait">
          {chatView === "categories" ? (
            <m.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-xs text-text-faint mb-2">{t.categories}</p>
              <div className="flex flex-wrap gap-2">
                {faqData.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border-mid bg-surface-card text-text-sub hover:border-primary hover:text-primary transition-colors"
                  >
                    <EmojiIcon emoji={cat.icon} label={cat.label[locale]} size="sm" tone="neutral" />
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
                    className="text-left text-xs px-3 py-2 rounded-xl border border-border-mid bg-surface-card text-text-sub hover:border-primary hover:text-primary transition-colors"
                  >
                    {q.question[locale]}
                  </button>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input de texto libre */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-surface-card border-t border-border-soft">
        <div className="flex items-center gap-2">
          <label htmlFor="faq-input" className="sr-only">{t.inputLabel}</label>
          <input
            id="faq-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 text-sm px-4 py-2.5 rounded-full border border-border-mid outline-none focus:border-primary transition-colors bg-surface-page text-text-main"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-primary disabled:bg-border-mid flex items-center justify-center transition-colors shrink-0"
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
