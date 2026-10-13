import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";

import type { Dictionary } from "@/lib/i18n";
import {
  CHAT_MESSAGE_BODY_MAX_LENGTH,
  type ConversationStatus,
} from "@/lib/chat/types";
import {
  computeEntryErrors,
  mergeThreadMessages,
  newClientMessageId,
  nextChatReconnectDelayMs,
  shouldPollVisitorHistory,
  type ChatEntryErrors,
  type ChatEntryField,
  type ChatEntryValues,
  type ChatPendingMessage,
  type ChatThreadMessage,
} from "@/lib/chat/visitor-view-utils";

/**
 * Visitor chat session controller for the HelpHub chat view.
 *
 * Owns every piece of session state (phase, thread, composer, entry form) and
 * every side effect (bootstrap, SSE stream, bounded fallback polling, online
 * detection, focus management) so the view component stays a thin render of the
 * current phase. It talks only to the authorized visitor API routes with the
 * hardened session cookie; it never persists a conversation id, a resume token,
 * a session value or any PII in `localStorage`/`sessionStorage`.
 */

export type ChatPhase = "loading" | "entry" | "thread" | "unavailable" | "error";

const HISTORY_LIMIT = 50;
const FALLBACK_POLL_INTERVAL_MS = 15_000;
const CHAT_SSE_CHANGED_EVENT = "conversation_changed";

/* ── API contract ─────────────────────────────────────────────────── */

type ConversationPayload = {
  conversation: { status: ConversationStatus; createdAt: string; lastMessageAt: string | null };
};

type HistoryPayload = {
  messages: ChatThreadMessage[];
  nextCursor: string | null;
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: string };

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

/* ── Controller surface ───────────────────────────────────────────── */

export type ChatController = {
  phase: ChatPhase;
  conversationStatus: ConversationStatus;
  messages: ChatThreadMessage[];
  pending: ChatPendingMessage[];
  entryValues: ChatEntryValues;
  entryErrors: ChatEntryErrors;
  submitting: boolean;
  formError: string | null;
  composerValue: string;
  setComposerValue: Dispatch<SetStateAction<string>>;
  sending: boolean;
  online: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  bootstrap: () => Promise<void>;
  startEntry: () => void;
  handleEntryChange: (field: ChatEntryField, value: string | boolean) => void;
  handleEntrySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleSend: () => void;
  handleRetry: (clientMessageId: string) => void;
};

export function useVisitorChat(t: Dictionary["helpHub"]["chat"]): ChatController {
  const [phase, setPhase] = useState<ChatPhase>("loading");
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>("open");
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [pending, setPending] = useState<ChatPendingMessage[]>([]);
  const [entryValues, setEntryValues] = useState<ChatEntryValues>({
    name: "",
    email: "",
    phone: "",
    marketingConsent: false,
  });
  const [entryErrors, setEntryErrors] = useState<ChatEntryErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const startEntry = useCallback(() => {
    setEntryErrors({});
    setFormError(null);
    setComposerValue("");
    setPhase("entry");
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/chat/visitor/history?limit=${HISTORY_LIMIT}`,
        { cache: "no-store", credentials: "same-origin" }
      );
      if (response.status === 401) {
        // The visitor session expired or was revoked: fall back to the entry form.
        startEntry();
        return false;
      }
      if (!response.ok) return false;
      const envelope = await readEnvelope<HistoryPayload>(response);
      if (!envelope || !envelope.success) return false;
      setMessages((previous) => mergeThreadMessages(previous, envelope.data.messages));
      return true;
    } catch {
      return false;
    }
  }, [startEntry]);

  const bootstrap = useCallback(async () => {
    setPhase("loading");
    try {
      const response = await fetch("/api/chat/visitor/conversations", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        startEntry();
        return;
      }
      if (response.status === 404) {
        setPhase("unavailable");
        return;
      }
      if (!response.ok) {
        setPhase("error");
        return;
      }
      const envelope = await readEnvelope<ConversationPayload>(response);
      if (!envelope || !envelope.success) {
        setPhase("error");
        return;
      }
      setConversationStatus(envelope.data.conversation.status);
      setPhase("thread");
      await refreshHistory();
    } catch {
      setPhase("error");
    }
  }, [refreshHistory, startEntry]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (phase === "entry") firstFieldRef.current?.focus();
    if (phase === "thread") composerRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Explicit EventSource lifecycle: reconnect with bounded backoff on error and
  // refetch immediately on every opaque wake-up. Cleanup always closes the
  // socket so no listener survives unmount or a phase/status change.
  useEffect(() => {
    if (phase !== "thread" || conversationStatus === "closed" || !online) return;

    let disposed = false;
    let attempt = 0;
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/chat/visitor/stream");
      source.addEventListener(CHAT_SSE_CHANGED_EVENT, () => {
        void refreshHistory();
      });
      source.onopen = () => {
        attempt = 0;
        setSseConnected(true);
      };
      source.onerror = () => {
        setSseConnected(false);
        source?.close();
        source = null;
        if (disposed) return;
        const delay = nextChatReconnectDelayMs(attempt);
        attempt += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      source?.close();
      source = null;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      setSseConnected(false);
    };
  }, [phase, conversationStatus, online, refreshHistory]);

  // Bounded fallback polling: only while the SSE stream is not connected, and
  // only on a visible page. The history endpoint is page-bounded and reconciled
  // by id + composite `(created, id)` ordering, so it never reloads full history.
  useEffect(() => {
    if (phase !== "thread" || conversationStatus === "closed" || !online || sseConnected) return;
    const timer = window.setInterval(() => {
      if (!shouldPollVisitorHistory({ sseConnected, pageVisible: document.visibilityState === "visible" })) {
        return;
      }
      void refreshHistory();
    }, FALLBACK_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [phase, conversationStatus, online, sseConnected, refreshHistory]);

  // A visible page always reconciles once, even when SSE is healthy: an open
  // socket is not proof that every wake-up arrived.
  useEffect(() => {
    if (phase !== "thread" || conversationStatus === "closed" || !online) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshHistory();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [phase, conversationStatus, online, refreshHistory]);

  const handleEntryChange = useCallback((field: ChatEntryField, value: string | boolean) => {
    setEntryValues((previous) => ({ ...previous, [field]: value }) as ChatEntryValues);
    if (field === "marketingConsent") return;
    setEntryErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const handleEntrySubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const errors = computeEntryErrors(entryValues);
      setEntryErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setSubmitting(true);
      setFormError(null);
      try {
        const response = await fetch("/api/chat/visitor/conversations", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: entryValues.name,
            email: entryValues.email,
            phone: entryValues.phone.trim() === "" ? undefined : entryValues.phone,
            marketingConsent: entryValues.marketingConsent,
          }),
        });
        if (response.status === 429) {
          setFormError(t.rateLimited);
          return;
        }
        if (!response.ok) {
          setFormError(t.formError);
          return;
        }
        const envelope = await readEnvelope<ConversationPayload>(response);
        if (!envelope || !envelope.success) {
          setFormError(t.formError);
          return;
        }
        setConversationStatus(envelope.data.conversation.status);
        setMessages([]);
        setPending([]);
        setPhase("thread");
        await refreshHistory();
      } catch {
        setFormError(t.formError);
      } finally {
        setSubmitting(false);
      }
    },
    [entryValues, refreshHistory, t.formError, t.rateLimited]
  );

  const sendBody = useCallback(
    async (body: string, clientMessageId: string) => {
      setSending(true);
      setPending((previous) =>
        previous.map((item) =>
          item.clientMessageId === clientMessageId ? { ...item, failed: false } : item
        )
      );
      try {
        const response = await fetch("/api/chat/visitor/messages", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, clientMessageId }),
        });
        const envelope = response.ok
          ? await readEnvelope<{ message: ChatThreadMessage }>(response)
          : null;
        if (!envelope || !envelope.success) {
          setPending((previous) =>
            previous.map((item) =>
              item.clientMessageId === clientMessageId ? { ...item, failed: true } : item
            )
          );
          return;
        }
        setPending((previous) =>
          previous.filter((item) => item.clientMessageId !== clientMessageId)
        );
        setMessages((previous) => mergeThreadMessages(previous, [envelope.data.message]));
      } catch {
        setPending((previous) =>
          previous.map((item) =>
            item.clientMessageId === clientMessageId ? { ...item, failed: true } : item
          )
        );
      } finally {
        setSending(false);
        composerRef.current?.focus();
      }
    },
    []
  );

  const handleSend = useCallback(() => {
    const body = composerValue.trim();
    if (body.length === 0 || body.length > CHAT_MESSAGE_BODY_MAX_LENGTH) return;
    const clientMessageId = newClientMessageId();
    setPending((previous) => [...previous, { clientMessageId, body, failed: false }]);
    setComposerValue("");
    void sendBody(body, clientMessageId);
  }, [composerValue, sendBody]);

  const handleRetry = useCallback(
    (clientMessageId: string) => {
      const target = pending.find((item) => item.clientMessageId === clientMessageId);
      if (!target) return;
      void sendBody(target.body, target.clientMessageId);
    },
    [pending, sendBody]
  );

  return {
    phase,
    conversationStatus,
    messages,
    pending,
    entryValues,
    entryErrors,
    submitting,
    formError,
    composerValue,
    setComposerValue,
    sending,
    online,
    composerRef,
    firstFieldRef,
    bootstrap,
    startEntry,
    handleEntryChange,
    handleEntrySubmit,
    handleSend,
    handleRetry,
  };
}
