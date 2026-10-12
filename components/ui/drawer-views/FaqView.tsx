"use client";

import { useReducer, useRef, useEffect, startTransition } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useHelpHub } from "@/lib/help-hub-context";
import { findAnswer } from "@/lib/faq-matcher";
import type { FAQData } from "@/types";
import { trackHelpHubEvent } from "@/lib/help-hub-analytics";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  isAdvisorIntent,
  type FaqChatMessage,
  type FaqLeadData,
} from "./faq-chat-utils";
import { useFaqLeadFlow } from "./faq-lead-flow";
import FaqLeadForm from "./faq/FaqLeadForm";
import FaqAnswerView from "./faq/FaqAnswerView";
import FaqCategoryView from "./faq/FaqCategoryView";

type Message = FaqChatMessage;
type ChatView = "categories" | "questions";
type LeadData = FaqLeadData;

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

  const { handleLeadSubmit, handleLeadSkip, handleLeadContinueAnyway } = useFaqLeadFlow({
    messages,
    leadData,
    leadConsent,
    locale,
    product: drawerContext?.product ?? null,
    onWhatsAppConnect,
    onLeadDone: () => dispatch({ type: "leadDone" }),
    onLeadSaveError: (value) => dispatch({ type: "setLeadSaveError", value }),
  });

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
            <FaqLeadForm
              t={t}
              lang={lang}
              leadData={leadData}
              leadConsent={leadConsent}
              leadSaveError={leadSaveError}
              onFieldChange={(field, value) => dispatch({ type: "setLeadField", field, value })}
              onConsentChange={(value) => dispatch({ type: "setLeadConsent", value })}
              onSubmit={handleLeadSubmit}
              onSkip={handleLeadSkip}
              onContinueAnyway={handleLeadContinueAnyway}
            />
          )}
        </AnimatePresence>

        <FaqAnswerView
          t={t}
          th={th}
          showAdvisorButton={showAdvisorButton}
          showFallbackActions={showFallbackActions}
          showLeadForm={showLeadForm}
          onAdvisorClick={handleAdvisorClick}
          onContactClick={onContactClick}
        />

        <div ref={messagesEndRef} />
      </div>

      {/* Chips de categorías / preguntas */}
      <FaqCategoryView
        t={t}
        locale={locale}
        faqData={faqData}
        chatView={chatView}
        selectedCategoryId={selectedCategoryId}
        onCategoryClick={handleCategoryClick}
        onQuestionClick={handleQuestionClick}
        onBackToCategories={() => dispatch({ type: "backToCategories" })}
      />

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
