"use client";

import type { Dictionary, Locale } from "@/lib/i18n";
import {
  CHAT_MESSAGE_BODY_MAX_LENGTH,
  type ChatSenderType,
  type ConversationStatus,
} from "@/lib/chat/types";
import {
  resolveComposerKeyAction,
  type ChatEntryErrors,
  type ChatEntryField,
  type ChatEntryValues,
  type ChatPendingMessage,
  type ChatThreadMessage,
} from "@/lib/chat/visitor-view-utils";
import { useVisitorChat, type ChatController } from "./use-visitor-chat";

/**
 * HelpHub visitor chat view.
 *
 * Accessible, localized visitor experience for the live chat. All session
 * state and side effects live in the `useVisitorChat` controller; this file
 * only renders the current phase with presentational components. Message
 * bodies are rendered as plain text.
 *
 * The feature is server-gated: while `CHAT_ENABLED` is off every API call
 * resolves to the generic disabled response (`404`), which this view surfaces as
 * an honest "chat is not available" state. No flag value reaches the browser.
 *
 * The project's Vitest environment is `node` without a DOM library, so the
 * behaviour that can be verified deterministically — validation, keyboard
 * semantics, thread reconciliation, idempotency keys — lives in exported pure
 * helpers and presentational components covered by colocated tests.
 */

function senderLabel(t: Dictionary["helpHub"]["chat"], senderType: ChatSenderType): string {
  if (senderType === "operator") return t.operatorLabel;
  if (senderType === "bot") return t.botLabel;
  return t.youLabel;
}

/* ── Presentational components ────────────────────────────────────── */

type ChatEntryFormProps = {
  t: Dictionary["helpHub"]["chat"];
  lang: Locale;
  values: ChatEntryValues;
  errors: ChatEntryErrors;
  submitting: boolean;
  formError: string | null;
  onChange: (field: ChatEntryField, value: string | boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  firstFieldRef?: React.RefObject<HTMLInputElement | null>;
};

export function ChatEntryForm({
  t,
  lang,
  values,
  errors,
  submitting,
  formError,
  onChange,
  onSubmit,
  firstFieldRef,
}: ChatEntryFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-sm font-semibold text-text-sub">{t.entryTitle}</h3>
        <p className="mt-1 text-xs text-text-muted leading-relaxed">{t.entrySubtitle}</p>
      </div>

      <div>
        <label htmlFor="chat-entry-name" className="block text-xs font-semibold text-text-sub mb-1">
          {t.nameLabel} <span className="text-accent">*</span>
        </label>
        <input
          id="chat-entry-name"
          ref={firstFieldRef}
          type="text"
          required
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder={t.namePlaceholder}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "chat-entry-name-error" : undefined}
          className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
        />
        {errors.name ? (
          <p id="chat-entry-name-error" role="alert" className="mt-1 text-xs text-red-600">
            {t.nameError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="chat-entry-email" className="block text-xs font-semibold text-text-sub mb-1">
          {t.emailLabel} <span className="text-accent">*</span>
        </label>
        <input
          id="chat-entry-email"
          type="email"
          required
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder={t.emailPlaceholder}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "chat-entry-email-error" : undefined}
          className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
        />
        {errors.email ? (
          <p id="chat-entry-email-error" role="alert" className="mt-1 text-xs text-red-600">
            {t.emailError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="chat-entry-phone" className="block text-xs font-semibold text-text-sub mb-1">
          {t.phoneLabel}
        </label>
        <input
          id="chat-entry-phone"
          type="tel"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder={t.phonePlaceholder}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? "chat-entry-phone-error" : undefined}
          className="w-full text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors"
        />
        {errors.phone ? (
          <p id="chat-entry-phone-error" role="alert" className="mt-1 text-xs text-red-600">
            {t.phoneError}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-text-muted leading-relaxed">
        {t.servicePurpose}{" "}
        <a
          href={`/${lang}/politicas`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          {t.privacyLink}
        </a>
      </p>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={values.marketingConsent}
          onChange={(e) => onChange("marketingConsent", e.target.checked)}
          className="mt-0.5 accent-primary shrink-0"
        />
        <span className="text-xs text-text-muted leading-relaxed">{t.marketingOptIn}</span>
      </label>

      {formError ? (
        <p role="alert" className="text-xs text-red-600">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center text-sm py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? t.starting : t.startButton}
      </button>
    </form>
  );
}

type ChatThreadProps = {
  t: Dictionary["helpHub"]["chat"];
  messages: readonly ChatThreadMessage[];
  pending: readonly ChatPendingMessage[];
  status: ConversationStatus;
  online: boolean;
  onRetry: (clientMessageId: string) => void;
};

function MessageBubble({
  t,
  message,
}: {
  t: Dictionary["helpHub"]["chat"];
  message: ChatThreadMessage;
}) {
  const isVisitor = message.senderType === "visitor";
  return (
    <div className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}>
      <span className="text-[10px] uppercase tracking-wide text-text-faint">
        {senderLabel(t, message.senderType)}
      </span>
      <p
        className={`mt-0.5 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
          isVisitor ? "bg-primary text-white" : "bg-surface-soft text-text-main"
        }`}
      >
        {message.body}
      </p>
    </div>
  );
}

function PendingBubble({
  t,
  pending,
  onRetry,
}: {
  t: Dictionary["helpHub"]["chat"];
  pending: ChatPendingMessage;
  onRetry: (clientMessageId: string) => void;
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] uppercase tracking-wide text-text-faint">{t.youLabel}</span>
      <p className="mt-0.5 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm bg-primary/60 text-white">
        {pending.body}
      </p>
      {pending.failed ? (
        <div className="mt-1 flex items-center gap-2">
          <span role="alert" className="text-xs text-red-600">
            {t.failedToSend}
          </span>
          <button
            type="button"
            onClick={() => onRetry(pending.clientMessageId)}
            className="text-xs font-semibold text-primary underline"
          >
            {t.retry}
          </button>
        </div>
      ) : (
        <span role="status" className="mt-1 text-xs text-text-faint">
          {t.sending}
        </span>
      )}
    </div>
  );
}

export function ChatThread({ t, messages, pending, status, online, onRetry }: ChatThreadProps) {
  const hasAdvisorReply = messages.some(
    (message) => message.senderType === "operator" || message.senderType === "bot"
  );
  const isClosed = status === "closed";
  const showWaiting = !isClosed && messages.length > 0 && !hasAdvisorReply;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
      >
        {messages.length === 0 && pending.length === 0 ? (
          <p className="text-sm text-text-muted text-center">{t.emptyThread}</p>
        ) : null}
        {messages.map((message) => (
          <MessageBubble key={message.id} t={t} message={message} />
        ))}
        {pending.map((item) => (
          <PendingBubble key={item.clientMessageId} t={t} pending={item} onRetry={onRetry} />
        ))}
      </div>

      {showWaiting ? (
        <p role="status" className="px-4 pb-2 text-xs text-text-muted">
          {t.waiting}
        </p>
      ) : null}

      {isClosed ? (
        <div role="status" className="mx-4 mb-2 rounded-xl border border-border-mid bg-surface-soft p-3">
          <p className="text-sm font-semibold text-text-sub">{t.closedTitle}</p>
          <p className="mt-1 text-xs text-text-muted leading-relaxed">{t.closedText}</p>
        </div>
      ) : null}

      {!isClosed && !online ? (
        <p role="status" className="px-4 pb-2 text-xs text-amber-700">
          {t.offlineTitle}: {t.offlineText}
        </p>
      ) : null}
    </div>
  );
}

type ChatComposerProps = {
  t: Dictionary["helpHub"]["chat"];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  maxLength?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatComposer({
  t,
  value,
  onChange,
  onSend,
  sending,
  disabled,
  maxLength = CHAT_MESSAGE_BODY_MAX_LENGTH,
  textareaRef,
}: ChatComposerProps) {
  const overLimit = value.length > maxLength;
  const canSend = !disabled && !sending && !overLimit && value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const action = resolveComposerKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
    });
    if (action === "send") {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="border-t border-border-soft p-3 flex flex-col gap-2">
      <label htmlFor="chat-composer" className="sr-only">
        {t.composerLabel}
      </label>
      <textarea
        id="chat-composer"
        ref={textareaRef}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.composerPlaceholder}
        disabled={disabled}
        aria-describedby="chat-composer-counter"
        className="w-full resize-none text-sm px-3 py-2 rounded-lg border border-border-mid bg-surface-page text-text-main focus:border-primary focus:outline-none transition-colors disabled:opacity-40"
      />
      <div className="flex items-center justify-between gap-3">
        <span
          id="chat-composer-counter"
          aria-live="polite"
          className={`text-xs ${overLimit ? "text-red-600" : "text-text-faint"}`}
        >
          {value.length}/{maxLength}
        </span>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? t.sending : t.sendLabel}
        </button>
      </div>
    </div>
  );
}

export type ChatNoticeVariant = "loading" | "offline" | "unavailable" | "error";

type ChatNoticeProps = {
  t: Dictionary["helpHub"]["chat"];
  variant: ChatNoticeVariant;
  whatsappAvailable?: boolean;
  onRetry?: () => void;
  onOpenWhatsApp?: () => void;
  onOpenContact?: () => void;
};

export function ChatNotice({
  t,
  variant,
  whatsappAvailable,
  onRetry,
  onOpenWhatsApp,
  onOpenContact,
}: ChatNoticeProps) {
  const copy: Record<ChatNoticeVariant, { title: string; text: string | null }> = {
    loading: { title: t.loading, text: null },
    offline: { title: t.offlineTitle, text: t.offlineText },
    unavailable: { title: t.unavailableTitle, text: t.unavailableText },
    error: { title: t.errorTitle, text: t.errorText },
  };
  const current = copy[variant];

  return (
    <div role="status" className="flex flex-col gap-3 p-5">
      <p className="text-sm font-semibold text-text-sub">{current.title}</p>
      {current.text ? (
        <p className="text-xs text-text-muted leading-relaxed">{current.text}</p>
      ) : null}

      {variant === "unavailable" && whatsappAvailable ? (
        <button
          type="button"
          onClick={onOpenWhatsApp}
          className="w-full inline-flex items-center justify-center text-sm py-2.5 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
        >
          {t.whatsappFallback}
        </button>
      ) : null}

      {variant === "unavailable" ? (
        <button
          type="button"
          onClick={onOpenContact}
          className="w-full inline-flex items-center justify-center text-sm py-2.5 rounded-xl border border-border-mid text-text-sub hover:border-primary hover:text-primary transition-colors"
        >
          {t.contactFallback}
        </button>
      ) : null}

      {variant === "error" ? (
        <button
          type="button"
          onClick={onRetry}
          className="w-full inline-flex items-center justify-center text-sm py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
        >
          {t.loadRetry}
        </button>
      ) : null}
    </div>
  );
}

/* ── Phase rendering ──────────────────────────────────────────────── */

type ChatPhaseBodyProps = {
  t: Dictionary["helpHub"]["chat"];
  lang: Locale;
  chat: ChatController;
  whatsappAvailable: boolean;
  onOpenWhatsApp: () => void;
  onOpenContact: () => void;
};

export function ChatPhaseBody({
  t,
  lang,
  chat,
  whatsappAvailable,
  onOpenWhatsApp,
  onOpenContact,
}: ChatPhaseBodyProps) {
  const { phase } = chat;

  if (phase === "loading") {
    return <ChatNotice t={t} variant={chat.online ? "loading" : "offline"} />;
  }
  if (phase === "unavailable") {
    return (
      <ChatNotice
        t={t}
        variant="unavailable"
        whatsappAvailable={whatsappAvailable}
        onOpenWhatsApp={onOpenWhatsApp}
        onOpenContact={onOpenContact}
      />
    );
  }
  if (phase === "error") {
    return <ChatNotice t={t} variant="error" onRetry={() => void chat.bootstrap()} />;
  }
  if (phase === "entry") {
    return (
      <ChatEntryForm
        t={t}
        lang={lang}
        values={chat.entryValues}
        errors={chat.entryErrors}
        submitting={chat.submitting}
        formError={chat.formError}
        onChange={chat.handleEntryChange}
        onSubmit={chat.handleEntrySubmit}
        firstFieldRef={chat.firstFieldRef}
      />
    );
  }

  const isClosed = chat.conversationStatus === "closed";
  return (
    <>
      <ChatThread
        t={t}
        messages={chat.messages}
        pending={chat.pending}
        status={chat.conversationStatus}
        online={chat.online}
        onRetry={chat.handleRetry}
      />
      {isClosed ? (
        <button
          type="button"
          onClick={chat.startEntry}
          className="mx-4 mb-3 inline-flex items-center justify-center text-sm py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
        >
          {t.newConversation}
        </button>
      ) : (
        <ChatComposer
          t={t}
          value={chat.composerValue}
          onChange={chat.setComposerValue}
          onSend={chat.handleSend}
          sending={chat.sending}
          disabled={!chat.online}
          textareaRef={chat.composerRef}
        />
      )}
    </>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */

type Props = {
  dict: Dictionary;
  lang: Locale;
  whatsappAvailable: boolean;
  onOpenWhatsApp: () => void;
  onOpenContact: () => void;
};

export default function ChatView({
  dict,
  lang,
  whatsappAvailable,
  onOpenWhatsApp,
  onOpenContact,
}: Props) {
  const t = dict.helpHub.chat;
  const chat = useVisitorChat(t);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatPhaseBody
        t={t}
        lang={lang}
        chat={chat}
        whatsappAvailable={whatsappAvailable}
        onOpenWhatsApp={onOpenWhatsApp}
        onOpenContact={onOpenContact}
      />
    </div>
  );
}
