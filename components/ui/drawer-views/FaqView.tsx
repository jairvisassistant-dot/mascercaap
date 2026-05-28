"use client";

import { useReducer, useRef, useEffect, startTransition } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useHelpHub } from "@/lib/help-hub-context";
import { findAnswer } from "@/lib/faq-matcher";
import type { FAQData } from "@/types";
import { SITE_CONFIG } from "@/lib/config";
import { trackHelpHubEvent } from "@/lib/help-hub-analytics";
import { buildWhatsAppLinks, buildWhatsAppMessage } from "@/lib/whatsapp";
import { buildHandoffSummary } from "@/lib/handoff-summary";
import EmojiIcon from "@/components/ui/EmojiIcon";
import type { Dictionary, Locale } from "@/lib/i18n";

type Message = { id: string; role: "bot" | "user"; text: string };
type ChatView = "categories" | "questions";
type LeadTipo = "pedido" | "negocio" | "consulta";
type LeadData = { nombre: string; email: string; tipo: LeadTipo | "" };

type Props = {
  dict: Dictionary;
  lang: Locale;
  faqData: FAQData;
  onContactClick: () => void;
  onWhatsAppConnect: (appUrl: string | null, webUrl: string | null, leadSaved: boolean) => void;
};

const FAQ_SESSION_KEY = "helphub:faq-session:v1";

type FaqSessionState = {
  locale: Locale;
  messages: Message[];
  chatView: ChatView;
  selectedCategoryId: string | null;
  showFallbackActions: boolean;
  showAdvisorButton: boolean;
  showLeadForm: boolean;
  leadData: LeadData;
  leadConsent: boolean;
};

const WA_ICON = (
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
);

type State = {
  messages: Message[];
  chatView: ChatView;
  selectedCategoryId: string | null;
  input: string;
  showFallbackActions: boolean;
  showAdvisorButton: boolean;
  showLeadForm: boolean;
  leadData: LeadData;
  leadConsent: boolean;
  leadSaveError: boolean;
};

type Action =
  | { type: "setInput"; value: string }
  | { type: "selectCategory"; message: Message; categoryId: string }
  | { type: "showAnswer"; userMsg: Message; botMsg: Message }
  | { type: "showFallback"; userMsg: Message; botMsg: Message }
  | { type: "showAdvisor"; botMsg: Message }
  | { type: "advisorFromSubmit"; userMsg: Message; botMsg: Message }
  | { type: "submitMatch"; userMsg: Message; botMsg: Message }
  | { type: "submitNoMatch"; userMsg: Message; botMsg: Message }
  | { type: "setLeadField"; field: keyof LeadData; value: string }
  | { type: "setLeadConsent"; value: boolean }
  | { type: "setLeadSaveError"; value: boolean }
  | { type: "leadDone" }
  | { type: "backToCategories" }
  | { type: "restoreSession"; session: Omit<FaqSessionState, "locale"> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setInput":
      return { ...state, input: action.value };
    case "selectCategory":
      return {
        ...state,
        messages: [...state.messages, action.message],
        selectedCategoryId: action.categoryId,
        chatView: "questions",
        showFallbackActions: false,
      };
    case "showAnswer":
      return {
        ...state,
        messages: [...state.messages, action.userMsg, action.botMsg],
        showFallbackActions: false,
        showAdvisorButton: true,
      };
    case "showFallback":
      return {
        ...state,
        messages: [...state.messages, action.userMsg, action.botMsg],
        showFallbackActions: true,
        showAdvisorButton: false,
      };
    case "showAdvisor":
      return {
        ...state,
        messages: [...state.messages, action.botMsg],
        showLeadForm: true,
        showAdvisorButton: false,
        showFallbackActions: false,
      };
    case "advisorFromSubmit":
      return {
        ...state,
        messages: [...state.messages, action.userMsg, action.botMsg],
        input: "",
        showLeadForm: true,
        showAdvisorButton: false,
        showFallbackActions: false,
        chatView: "categories",
        selectedCategoryId: null,
      };
    case "submitMatch":
      return {
        ...state,
        messages: [...state.messages, action.userMsg, action.botMsg],
        input: "",
        showFallbackActions: false,
        showAdvisorButton: true,
        chatView: "categories",
        selectedCategoryId: null,
      };
    case "submitNoMatch":
      return {
        ...state,
        messages: [...state.messages, action.userMsg, action.botMsg],
        input: "",
        showFallbackActions: true,
        showAdvisorButton: false,
        chatView: "categories",
        selectedCategoryId: null,
      };
    case "setLeadField":
      return { ...state, leadData: { ...state.leadData, [action.field]: action.value } };
    case "setLeadConsent":
      return { ...state, leadConsent: action.value };
    case "setLeadSaveError":
      return { ...state, leadSaveError: action.value };
    case "leadDone":
      return { ...state, showLeadForm: false, leadSaveError: false };
    case "backToCategories":
      return { ...state, chatView: "categories", selectedCategoryId: null };
    case "restoreSession":
      return {
        ...state,
        messages: action.session.messages,
        chatView: action.session.chatView,
        selectedCategoryId: action.session.selectedCategoryId,
        showFallbackActions: action.session.showFallbackActions,
        showAdvisorButton: action.session.showAdvisorButton,
        showLeadForm: action.session.showLeadForm,
        leadData: action.session.leadData,
        leadConsent: action.session.leadConsent,
      };
    default:
      return state;
  }
}

export default function FaqView({ dict, lang, faqData, onContactClick, onWhatsAppConnect }: Props) {
  const { drawerContext } = useHelpHub();
  const locale = lang;
  const t = dict.chatbot;
  const th = dict.helpHub;

  const welcomeText = drawerContext?.product
    ? th.contextGreeting.replace("{product}", drawerContext.product)
    : t.welcome;

  const [state, dispatch] = useReducer(reducer, {
    messages: [{ id: "welcome", role: "bot" as const, text: welcomeText }],
    chatView: "categories" as ChatView,
    selectedCategoryId: null,
    input: "",
    showFallbackActions: false,
    showAdvisorButton: false,
    showLeadForm: false,
    leadData: { nombre: "", email: "", tipo: "" as const },
    leadConsent: false,
    leadSaveError: false,
  });
  const {
    messages, chatView, selectedCategoryId, input,
    showFallbackActions, showAdvisorButton, showLeadForm,
    leadData, leadConsent, leadSaveError,
  } = state;

  const pendingWhatsAppRef = useRef<{ appUrl: string | null; webUrl: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextMessageIdRef = useRef(0);

  function makeMsg(role: "bot" | "user", text: string): Message {
    nextMessageIdRef.current += 1;
    return { id: `msg-${nextMessageIdRef.current}`, role, text };
  }

  // Session restore
  useEffect(() => {
    if (drawerContext?.product) return;

    const raw = window.sessionStorage.getItem(FAQ_SESSION_KEY);
    if (!raw) return;

    try {
      const session = JSON.parse(raw) as FaqSessionState;
      if (session.locale !== locale || session.messages.length === 0) return;

      startTransition(() => {
        dispatch({ type: "restoreSession", session });
      });
      nextMessageIdRef.current = session.messages.reduce((max, message) => {
        const numeric = Number.parseInt(message.id.replace("msg-", ""), 10);
        return Number.isNaN(numeric) ? max : Math.max(max, numeric);
      }, 0);
    } catch {
      window.sessionStorage.removeItem(FAQ_SESSION_KEY);
    }
  }, [drawerContext?.product, locale]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showLeadForm]);

  // Auto-persist
  useEffect(() => {
    if (drawerContext?.product) {
      window.sessionStorage.removeItem(FAQ_SESSION_KEY);
      return;
    }

    const session: FaqSessionState = {
      locale,
      messages: state.messages,
      chatView: state.chatView,
      selectedCategoryId: state.selectedCategoryId,
      showFallbackActions: state.showFallbackActions,
      showAdvisorButton: state.showAdvisorButton,
      showLeadForm: state.showLeadForm,
      leadData: state.leadData,
      leadConsent: state.leadConsent,
    };

    window.sessionStorage.setItem(FAQ_SESSION_KEY, JSON.stringify(session));
  }, [state, drawerContext?.product, locale]);

  function handleCategoryClick(categoryId: string) {
    const category = faqData.categories.find((c) => c.id === categoryId);
    if (!category) return;
    dispatch({ type: "selectCategory", message: makeMsg("user", category.label[locale]), categoryId });
  }

  function handleQuestionClick(questionId: string) {
    const category = faqData.categories.find((c) => c.id === selectedCategoryId);
    const question = category?.questions.find((q) => q.id === questionId);
    if (!question) return;
    dispatch({
      type: "showAnswer",
      userMsg: makeMsg("user", question.question[locale]),
      botMsg: makeMsg("bot", question.answer[locale]),
    });
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

    if (isAdvisorIntent(query)) {
      trackHelpHubEvent("helphub_advisor_cta_clicked", {
        source: "direct_intent",
        locale,
        has_product_context: Boolean(drawerContext?.product),
      });
      dispatch({
        type: "advisorFromSubmit",
        userMsg: makeMsg("user", query),
        botMsg: makeMsg("bot", t.leadFormIntro),
      });
      return;
    }

    const match = findAnswer(query, locale, faqData);
    if (match) {
      dispatch({
        type: "submitMatch",
        userMsg: makeMsg("user", query),
        botMsg: makeMsg("bot", match.question.answer[locale]),
      });
    } else {
      trackHelpHubEvent("helphub_faq_no_match", {
        locale,
        query_length: query.length,
        has_product_context: Boolean(drawerContext?.product),
      });
      dispatch({
        type: "submitNoMatch",
        userMsg: makeMsg("user", query),
        botMsg: makeMsg("bot", t.fallback),
      });
    }
  }

  function handleAdvisorClick(source: "advisor_pill" | "fallback_whatsapp" | "direct_intent") {
    trackHelpHubEvent("helphub_advisor_cta_clicked", {
      source,
      locale,
      has_product_context: Boolean(drawerContext?.product),
    });
    dispatch({ type: "showAdvisor", botMsg: makeMsg("bot", t.leadFormIntro) });
  }

  function buildConnectUrls(message: string) {
    return buildWhatsAppLinks(SITE_CONFIG.whatsappNumber, message);
  }

  function buildWhatsAppMessageText(currentMessages: Message[], lead?: Partial<LeadData>): string {
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
      .flatMap((msg) => {
        if (msg.id === "welcome") return [];
        return [msg.role === "user"
          ? `Yo: "${msg.text}"`
          : `Bot: "${msg.text.length > 120 ? msg.text.slice(0, 120) + "…" : msg.text}"`];
      })
      .join("\n");

    if (conversation) lines.push(`\nConversación:\n${conversation}`);
    lines.push("\n¿Me pueden ayudar?");
    return buildWhatsAppMessage(lines);
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadConsent || !leadData.nombre.trim() || !leadData.tipo) return;
    dispatch({ type: "setLeadSaveError", value: false });
    pendingWhatsAppRef.current = null;

    const { appUrl, webUrl } = buildConnectUrls(buildWhatsAppMessageText(messages, leadData));

    let leadSaved = false;
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: leadData.nombre.trim(),
          email: leadData.email.trim() || null,
          tipo: leadData.tipo,
          producto_interes: drawerContext?.product ?? null,
          preguntas_bot: messages.flatMap((m) =>
            m.role === "user" && m.id !== "welcome" ? [m.text] : []
          ),
          resumen_handoff: buildHandoffSummary(messages, {
            nombre: leadData.nombre.trim(),
            email: leadData.email.trim() || null,
            tipo: leadData.tipo,
            producto_interes: drawerContext?.product ?? null,
          }),
        }),
      });
      leadSaved = res.ok;
      trackHelpHubEvent("helphub_lead_submit_result", {
        locale,
        result: res.ok ? "success" : "error",
        tipo: leadData.tipo,
        has_email: Boolean(leadData.email.trim()),
      });
    } catch {
      console.error("Error guardando lead");
      trackHelpHubEvent("helphub_lead_submit_result", {
        locale,
        result: "network_error",
        tipo: leadData.tipo,
        has_email: Boolean(leadData.email.trim()),
      });
      dispatch({ type: "setLeadSaveError", value: true });
      pendingWhatsAppRef.current = { appUrl, webUrl };
      return;
    }

    dispatch({ type: "leadDone" });
    trackHelpHubEvent("helphub_whatsapp_opened", {
      source: "lead_submit",
      locale,
      destination: appUrl ? "app" : webUrl ? "web" : "unavailable",
      lead_saved: leadSaved,
    });
    onWhatsAppConnect(appUrl, webUrl, leadSaved);
  }

  function handleLeadContinueAnyway() {
    if (!pendingWhatsAppRef.current) return;
    const { appUrl, webUrl } = pendingWhatsAppRef.current;
    dispatch({ type: "leadDone" });
    pendingWhatsAppRef.current = null;
    trackHelpHubEvent("helphub_whatsapp_opened", {
      source: "lead_submit_error_continue",
      locale,
      destination: appUrl ? "app" : webUrl ? "web" : "unavailable",
      lead_saved: false,
    });
    onWhatsAppConnect(appUrl, webUrl, false);
  }

  function handleLeadSkip() {
    const { appUrl, webUrl } = buildConnectUrls(buildWhatsAppMessageText(messages));
    dispatch({ type: "leadDone" });
    trackHelpHubEvent("helphub_whatsapp_opened", {
      source: "lead_skip",
      locale,
      destination: appUrl ? "app" : webUrl ? "web" : "unavailable",
      lead_saved: false,
    });
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-soft">
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
                  <label htmlFor="faq-lead-nombre" className="block text-xs font-semibold text-text-sub mb-1">
                    {t.leadName} <span className="text-accent">*</span>
                  </label>
                  <input
                    id="faq-lead-nombre"
                    type="text"
                    value={leadData.nombre}
                    onChange={(e) => dispatch({ type: "setLeadField", field: "nombre", value: e.target.value })}
                    placeholder={t.leadNamePlaceholder}
                    required
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="faq-lead-email" className="block text-xs font-semibold text-text-sub mb-1">
                    {t.leadEmail}
                  </label>
                  <input
                    id="faq-lead-email"
                    type="email"
                    value={leadData.email}
                    onChange={(e) => dispatch({ type: "setLeadField", field: "email", value: e.target.value })}
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
                          onChange={() => dispatch({ type: "setLeadField", field: "tipo", value: tipo })}
                          className="sr-only"
                        />
                        <span
                          className={`size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            leadData.tipo === tipo ? "border-primary" : "border-border-mid"
                          }`}
                        >
                          {leadData.tipo === tipo && (
                            <span className="size-1.5 rounded-full bg-primary block" />
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
                    onChange={(e) => dispatch({ type: "setLeadConsent", value: e.target.checked })}
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

                {/* Error de red al guardar lead */}
                {leadSaveError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs text-amber-800">
                      {lang === "es"
                        ? "No pudimos guardar tu información por un error de red."
                        : "We couldn't save your info due to a network error."}
                    </p>
                    <button
                      type="button"
                      onClick={handleLeadContinueAnyway}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors"
                    >
                      <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        {WA_ICON}
                      </svg>
                      {lang === "es" ? "Continuar a WhatsApp de todas formas" : "Continue to WhatsApp anyway"}
                    </button>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!leadConsent || !leadData.nombre.trim() || !leadData.tipo}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
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
                type="button"
                onClick={() => handleAdvisorClick("advisor_pill")}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-colors font-medium shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
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
                type="button"
                onClick={() => handleAdvisorClick("fallback_whatsapp")}
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors font-medium w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                  {WA_ICON}
                </svg>
                {th.menu.whatsapp}
              </button>
              <button
                type="button"
                onClick={onContactClick}
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary hover:text-white transition-colors font-medium w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    type="button"
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border-mid bg-surface-card text-text-sub hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
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
                type="button"
                onClick={() => dispatch({ type: "backToCategories" })}
                className="text-xs text-primary hover:underline mb-2 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
              >
                ← {t.backToCategories}
              </button>
              <div className="flex flex-col gap-1.5">
                {selectedCategory?.questions.map((q) => (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => handleQuestionClick(q.id)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-border-mid bg-surface-card text-text-sub hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
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
            onChange={(e) => dispatch({ type: "setInput", value: e.target.value })}
            placeholder={t.placeholder}
            className="flex-1 text-sm px-4 py-2.5 rounded-full border border-border-mid outline-none focus:border-primary transition-colors bg-surface-page text-text-main"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="size-9 rounded-full bg-primary disabled:bg-border-mid flex items-center justify-center transition-colors shrink-0"
            aria-label={t.sendAriaLabel}
          >
            <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
