"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { ChatCloseResult, ConversationStatus } from "@/lib/chat/types";
import {
  computeReplyError,
  isPushOptInSupported,
  nextInboxReconnectDelayMs,
  resolveCloseConfirmation,
  shouldPollInbox,
  shouldRecoverInbox,
  urlBase64ToUint8Array,
} from "@/lib/chat/inbox-utils";

/**
 * Coordinator inbox workspace logic.
 *
 * The state, effects and data-access helpers behind `InboxClient` live here so
 * the component file only exports components (keeping Fast Refresh able to
 * preserve its state) and stays a thin orchestrator. Every authorization
 * decision lives on the server (admin/MFA boundary); these hooks only carry a
 * same-origin session and never send a role or operator identity. Conversation
 * UUIDs never reach the browser: the API exposes opaque handles only.
 */

export type ConversationListItem = {
  readonly conversationHandle: string;
  readonly status: ConversationStatus;
  readonly visitorName: string;
  readonly assignedOperatorId: string | null;
  readonly closeResult: ChatCloseResult | null;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastMessageAt: string | null;
  readonly closedAt: string | null;
};

export type ConversationDetail = ConversationListItem & {
  readonly visitorEmail: string;
  readonly visitorPhone: string | null;
  readonly closeNote: string | null;
};

export type MessageView = {
  readonly id: string;
  readonly senderType: "visitor" | "operator" | "bot";
  readonly body: string;
  readonly createdAt: string;
};

/** The close-form payload the thread panel submits to the workspace. */
export type ThreadCloseInput = {
  readonly closeResult: ChatCloseResult;
  readonly closeNote: string;
  readonly purge: boolean;
  readonly confirmPurge: boolean;
};

export const CHAT_SSE_CHANGED_EVENT = "conversation_changed";
const OPERATOR_FALLBACK_POLL_INTERVAL_MS = 15_000;
const OPERATOR_RECOVERY_REFETCH_INTERVAL_MS = 30_000;

/* ── Push notifications (opt-in) ──────────────────────────────────── */

/**
 * The browser push capability never changes for the lifetime of a tab, so the
 * subscription used by `useSyncExternalStore` below is a no-op.
 */
const subscribePushCapability = () => () => {};

/* ── Data access (same-origin, no identity sent) ──────────────────── */
type FetchState = "ok" | "denied" | "error";

export async function readResponse(
  response: Response
): Promise<{ state: FetchState; data: unknown }> {
  if (response.status === 401 || response.status === 403) return { state: "denied", data: null };
  if (!response.ok) return { state: "error", data: null };
  try {
    return { state: "ok", data: await response.json() };
  } catch {
    return { state: "error", data: null };
  }
}

export function sameOriginInit(init?: RequestInit): RequestInit {
  return { cache: "no-store", credentials: "same-origin", ...init };
}

/* ── Hooks ───────────────────────────────────────────────────────── */

/** Badging API (best-effort, degrades silently where unsupported). */
export function useInboxBadge(conversations: readonly ConversationListItem[]): void {
  // Mirror the aggregate unread count on the app icon so an unopened tab still
  // signals.
  useEffect(() => {
    const totalUnread = conversations.reduce(
      (sum, item) => sum + (item.unreadCount > 0 ? 1 : 0),
      0
    );
    const badge = (navigator as { setAppBadge?: (count?: number) => Promise<void> })
      .setAppBadge;
    if (typeof badge !== "function") return;
    if (totalUnread === 0) {
      void badge.call(navigator).catch(() => undefined);
    } else {
      void badge.call(navigator, totalUnread).catch(() => undefined);
    }
  }, [conversations]);
}

/**
 * Push-notification opt-in state and actions. The permission prompt is
 * requested only on an explicit click, the toggle is derived (never free-form
 * state), and a blocked permission degrades to a static hint instead of a dead
 * button.
 */
export function usePushOptIn(input: {
  readonly denied: boolean;
  readonly pushPublicKey: string;
}): {
  readonly pushUiSupported: boolean;
  readonly pushSubscribed: boolean;
  readonly pushBusy: boolean;
  readonly enablePush: () => Promise<void>;
  readonly disablePush: () => Promise<void>;
} {
  const { denied, pushPublicKey } = input;
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  // Browser push capability is an environment value, not component state.
  // `getServerSnapshot` keeps the server's `false` during SSR *and* during the
  // client's hydration pass, then React re-renders with the real value — so the
  // push control takes the same branch on both sides and nothing is read from
  // `window`/`navigator` while rendering.
  const pushUiSupported = useSyncExternalStore(
    subscribePushCapability,
    isPushOptInSupported,
    () => false,
  );

  // Push subscription discovery on mount. The public VAPID half is plain server
  // config and arrives as a prop, so this effect only performs the browser-side
  // lookup: there is no fetch left here to race, double-fire or leak.
  useEffect(() => {
    if (denied || pushPublicKey === "" || !isPushOptInSupported()) return;
    let disposed = false;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!disposed && existing !== null) setPushSubscribed(true);
      } catch {
        // The opt-in control simply stays hidden; the inbox still works.
      }
    })();
    return () => {
      disposed = true;
    };
  }, [denied, pushPublicKey]);

  /** Opt-in: permission is requested only on this explicit coordinator click. */
  const enablePush = useCallback(async () => {
    if (pushBusy || pushPublicKey === "") return;
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushPublicKey),
      });
      const response = await fetch("/api/chat/operator/push-subscriptions", {
        ...sameOriginInit(),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (response.ok) setPushSubscribed(true);
    } catch {
      // Subscription failed; the toggle stays off and the inbox is unaffected.
    } finally {
      setPushBusy(false);
    }
  }, [pushBusy, pushPublicKey]);

  /** Opt-out: local unsubscribe first, then the server-side delete. */
  const disablePush = useCallback(async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription === null) {
        setPushSubscribed(false);
        return;
      }
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch("/api/chat/operator/push-subscriptions", {
        ...sameOriginInit(),
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setPushSubscribed(false);
    } catch {
      // Best-effort cleanup; a retry on the next visit reconciles the state.
    } finally {
      setPushBusy(false);
    }
  }, [pushBusy]);

  return { pushUiSupported, pushSubscribed, pushBusy, enablePush, disablePush };
}

/**
 * The conversation workspace: list state and pagination, SSE wake-ups with
 * bounded reconnect, visible-page fallback polling, and the open-thread
 * actions (read, reply, close/purge).
 */
export function useInboxThreads(): {
  readonly loading: boolean;
  readonly denied: boolean;
  readonly error: boolean;
  readonly conversations: ConversationListItem[];
  readonly nextCursor: string | null;
  readonly selectedHandle: string | null;
  readonly detail: ConversationDetail | null;
  readonly messages: MessageView[];
  readonly reply: string;
  readonly setReply: (value: string) => void;
  readonly busy: boolean;
  readonly actionError: string | null;
  readonly loadConversations: (
    cursor?: string | null,
    options?: { readonly silent?: boolean }
  ) => Promise<void>;
  readonly openConversation: (handle: string) => Promise<void>;
  readonly sendReply: () => Promise<void>;
  readonly closeConversation: (input: ThreadCloseInput) => Promise<void>;
} {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const clientMessageIdRef = useRef<string | null>(null);
  const selectedHandleRef = useRef<string | null>(null);

  useEffect(() => {
    selectedHandleRef.current = selectedHandle;
  }, [selectedHandle]);

  const loadConversations = useCallback(
    async (cursor: string | null = null, options: { silent?: boolean } = {}) => {
      const silent = options.silent === true;
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      try {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
        const response = await fetch(
          `/api/chat/operator/conversations${query}`,
          sameOriginInit()
        );
        const { state, data } = await readResponse(response);
        if (state === "denied") {
          setDenied(true);
          return;
        }
        if (state === "error") {
          if (!silent) setError(true);
          return;
        }
        const payload = data as {
          data: { conversations: ConversationListItem[]; nextCursor: string | null };
        };
        setConversations(payload.data.conversations);
        setNextCursor(payload.data.nextCursor);
      } catch {
        if (!silent) setError(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  /** Silent thread refresh for wake-up/recovery; never changes the read cursor. */
  const refreshSelectedThread = useCallback(async (handle: string) => {
    try {
      const response = await fetch(
        `/api/chat/operator/messages?conversationHandle=${encodeURIComponent(handle)}`,
        sameOriginInit()
      );
      const { state, data } = await readResponse(response);
      if (state === "denied") {
        setDenied(true);
        return;
      }
      if (state === "error") return;
      const payload = data as {
        data: { conversation: ConversationDetail; messages: MessageView[] };
      };
      setDetail(payload.data.conversation);
      setMessages(payload.data.messages);
    } catch {
      // Background refresh: a transient failure must not disturb the workspace.
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Explicit coordinator EventSource lifecycle: reconnect with bounded backoff,
  // and on every opaque wake-up silently refetch the list and the open thread.
  useEffect(() => {
    if (denied) return;

    let disposed = false;
    let attempt = 0;
    let source: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/chat/operator/stream");
      source.addEventListener(CHAT_SSE_CHANGED_EVENT, () => {
        void loadConversations(null, { silent: true });
        const handle = selectedHandleRef.current;
        if (handle !== null) void refreshSelectedThread(handle);
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
        const delay = nextInboxReconnectDelayMs(attempt);
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
  }, [denied, loadConversations, refreshSelectedThread]);

  // Visible-page fallback polling (15 s) while SSE is down, plus a periodic
  // recovery refetch (30 s) even when SSE is healthy.
  useEffect(() => {
    if (denied) return;

    const refresh = () => {
      void loadConversations(null, { silent: true });
      const handle = selectedHandleRef.current;
      if (handle !== null) void refreshSelectedThread(handle);
    };

    const fallback = window.setInterval(() => {
      if (!shouldPollInbox({
        sseConnected,
        pageVisible: document.visibilityState === "visible",
      })) {
        return;
      }
      refresh();
    }, OPERATOR_FALLBACK_POLL_INTERVAL_MS);

    const recovery = window.setInterval(() => {
      if (!shouldRecoverInbox({ pageVisible: document.visibilityState === "visible" })) return;
      refresh();
    }, OPERATOR_RECOVERY_REFETCH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(fallback);
      window.clearInterval(recovery);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [denied, sseConnected, loadConversations, refreshSelectedThread]);

  const openConversation = useCallback(async (handle: string) => {
    setSelectedHandle(handle);
    setDetail(null);
    setMessages([]);
    setActionError(null);
    clientMessageIdRef.current = null;
    try {
      const response = await fetch(
        `/api/chat/operator/messages?conversationHandle=${encodeURIComponent(handle)}`,
        sameOriginInit()
      );
      const { state, data } = await readResponse(response);
      if (state === "denied") return setDenied(true);
      if (state === "error") return setError(true);
      const payload = data as {
        data: { conversation: ConversationDetail; messages: MessageView[] };
      };
      setDetail(payload.data.conversation);
      setMessages(payload.data.messages);
      // Mark read; unread is derived server-side from the read cursor.
      void fetch(
        "/api/chat/operator/reads",
        sameOriginInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationHandle: handle }),
        })
      );
      setConversations((current) =>
        current.map((item) =>
          item.conversationHandle === handle ? { ...item, unreadCount: 0 } : item
        )
      );
    } catch {
      setError(true);
    }
  }, []);

  const sendReply = useCallback(async () => {
    if (!selectedHandle) return;
    const replyError = computeReplyError(reply);
    if (replyError) {
      setActionError(replyError === "reply_required" ? "Escribe una respuesta." : "La respuesta es demasiado larga.");
      return;
    }
    if (!clientMessageIdRef.current) {
      clientMessageIdRef.current = `reply-${crypto.randomUUID()}`;
    }
    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch(
        "/api/chat/operator/messages",
        sameOriginInit({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationHandle: selectedHandle,
            body: reply.trim(),
            clientMessageId: clientMessageIdRef.current,
          }),
        })
      );
      const { state, data } = await readResponse(response);
      if (state === "denied") return setDenied(true);
      if (state === "error") return setActionError("No se pudo enviar la respuesta.");
      const payload = data as { data: { message: MessageView } };
      setMessages((current) => [payload.data.message, ...current]);
      setReply("");
      clientMessageIdRef.current = null;
      setDetail((current) => (current ? { ...current, status: "assigned" } : current));
    } catch {
      setActionError("No se pudo enviar la respuesta.");
    } finally {
      setBusy(false);
    }
  }, [reply, selectedHandle]);

  const closeConversation = useCallback(
    async (input: ThreadCloseInput) => {
      if (!selectedHandle) return;
      if (!resolveCloseConfirmation({
        closeResult: input.closeResult,
        purge: input.purge,
        confirmPurge: input.confirmPurge,
      })) {
        setActionError("Confirma la eliminación definitiva para purgar el registro.");
        return;
      }
      setBusy(true);
      setActionError(null);
      try {
        const response = await fetch(
          "/api/chat/operator/close",
          sameOriginInit({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationHandle: selectedHandle,
              closeResult: input.closeResult,
              closeNote: input.closeNote || undefined,
              purge: input.purge,
              confirmPurge: input.confirmPurge,
            }),
          })
        );
        const { state, data } = await readResponse(response);
        if (state === "denied") return setDenied(true);
        if (state === "error") return setActionError("No se pudo cerrar la conversación.");
        if (input.purge) {
          setConversations((current) =>
            current.filter((item) => item.conversationHandle !== selectedHandle)
          );
          setSelectedHandle(null);
          setDetail(null);
          setMessages([]);
          return;
        }
        const payload = data as { data: { conversation: ConversationDetail } };
        setDetail(payload.data.conversation);
      } catch {
        setActionError("No se pudo cerrar la conversación.");
      } finally {
        setBusy(false);
      }
    },
    [selectedHandle]
  );

  return {
    loading,
    denied,
    error,
    conversations,
    nextCursor,
    selectedHandle,
    detail,
    messages,
    reply,
    setReply,
    busy,
    actionError,
    loadConversations,
    openConversation,
    sendReply,
    closeConversation,
  };
}
