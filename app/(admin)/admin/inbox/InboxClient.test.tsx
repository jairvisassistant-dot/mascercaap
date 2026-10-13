import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CHAT_MESSAGE_BODY_MAX_LENGTH } from "@/lib/chat/types";
import {
  computeReplyError,
  isPushOptInSupported,
  nextInboxReconnectDelayMs,
  resolveCloseConfirmation,
  resolveInboxViewState,
  resolvePushUiState,
  shouldPollInbox,
  shouldRecoverInbox,
} from "@/lib/chat/inbox-utils";
import { ConversationRow, InboxNotice, PushOptInControl } from "./InboxClient";

/**
 * Behaviour tests for the coordinator inbox client.
 *
 * The project runs Vitest in a `node` environment without a DOM library, so the
 * presentational states are rendered with `react-dom/server` and the decision
 * helpers are unit-tested directly. Interactive behaviour that needs a real DOM
 * (live refetch, focus management) is deferred to the browser-level suite.
 */

const noop = () => {};

describe("resolveInboxViewState", () => {
  it("prioritises access denied over loading and errors", () => {
    expect(
      resolveInboxViewState({ loading: true, denied: true, error: false, conversationCount: 0 })
    ).toEqual({ kind: "denied" });
  });

  it("maps loading, error, empty and ready in order", () => {
    expect(
      resolveInboxViewState({ loading: true, denied: false, error: false, conversationCount: 0 })
    ).toEqual({ kind: "loading" });
    expect(
      resolveInboxViewState({ loading: false, denied: false, error: true, conversationCount: 0 })
    ).toEqual({ kind: "error" });
    expect(
      resolveInboxViewState({ loading: false, denied: false, error: false, conversationCount: 0 })
    ).toEqual({ kind: "empty" });
    expect(
      resolveInboxViewState({ loading: false, denied: false, error: false, conversationCount: 3 })
    ).toEqual({ kind: "ready" });
  });
});

describe("computeReplyError", () => {
  it("requires a non-empty reply and enforces the 1..1000 bound", () => {
    expect(computeReplyError("   ")).toBe("reply_required");
    expect(computeReplyError("x".repeat(CHAT_MESSAGE_BODY_MAX_LENGTH + 1))).toBe("reply_too_long");
    expect(computeReplyError("hola")).toBeNull();
  });
});

describe("coordinator SSE/fallback helpers", () => {
  it("grows the reconnect delay with a bounded ceiling", () => {
    expect(nextInboxReconnectDelayMs(0)).toBe(3_000);
    expect(nextInboxReconnectDelayMs(3)).toBe(24_000);
    expect(nextInboxReconnectDelayMs(100)).toBe(30_000);
    expect(nextInboxReconnectDelayMs(Number.NaN)).toBe(3_000);
  });

  it("polls the inbox only when visible and SSE is unavailable", () => {
    expect(shouldPollInbox({ sseConnected: false, pageVisible: true })).toBe(true);
    expect(shouldPollInbox({ sseConnected: true, pageVisible: true })).toBe(false);
    expect(shouldPollInbox({ sseConnected: false, pageVisible: false })).toBe(false);
  });

  it("runs the recovery refetch whenever the page is visible", () => {
    expect(shouldRecoverInbox({ pageVisible: true })).toBe(true);
    expect(shouldRecoverInbox({ pageVisible: false })).toBe(false);
  });
});

describe("resolveCloseConfirmation", () => {
  it("requires a classification before closing", () => {
    expect(resolveCloseConfirmation({ closeResult: "", purge: false, confirmPurge: false })).toBe(
      false
    );
  });

  it("allows a plain close without the destructive confirmation", () => {
    expect(
      resolveCloseConfirmation({ closeResult: "resuelto", purge: false, confirmPurge: false })
    ).toBe(true);
  });

  it("requires the explicit destructive confirmation to purge", () => {
    expect(
      resolveCloseConfirmation({ closeResult: "resuelto", purge: true, confirmPurge: false })
    ).toBe(false);
    expect(
      resolveCloseConfirmation({ closeResult: "resuelto", purge: true, confirmPurge: true })
    ).toBe(true);
  });
});

describe("InboxNotice", () => {
  it("shows a bounded loading state", () => {
    const html = renderToStaticMarkup(<InboxNotice variant="loading" />);
    expect(html).toContain("Cargando");
  });

  it("shows an empty state", () => {
    const html = renderToStaticMarkup(<InboxNotice variant="empty" />);
    expect(html).toContain("No hay conversaciones");
  });

  it("offers a retry action on error", () => {
    const html = renderToStaticMarkup(<InboxNotice variant="error" onRetry={noop} />);
    expect(html).toContain("Reintentar");
  });

  it("offers a sign-out action when access is denied", () => {
    const html = renderToStaticMarkup(<InboxNotice variant="denied" />);
    expect(html).toContain("Acceso denegado");
    expect(html).toContain('action="/api/admin/auth/logout"');
  });
});

describe("ConversationRow", () => {
  it("shows only support data and no internal conversation id", () => {
    const html = renderToStaticMarkup(
      <ConversationRow
        item={{
          conversationHandle: "opaque-handle",
          status: "assigned",
          visitorName: "Ana",
          unreadCount: 2,
          lastMessageAt: "2026-10-09T12:05:00.000Z",
          closeResult: null,
        }}
        active={false}
        onSelect={noop}
      />
    );
    expect(html).toContain("Ana");
    expect(html).toContain("2");
    expect(html).toContain("Asignada");
    expect(html).not.toContain("conversation-1");
  });

  it("shows the closed outcome when present", () => {
    const html = renderToStaticMarkup(
      <ConversationRow
        item={{
          conversationHandle: "opaque-handle",
          status: "closed",
          visitorName: "Ana",
          unreadCount: 0,
          lastMessageAt: null,
          closeResult: "resuelto",
        }}
        active
        onSelect={noop}
      />
    );
    expect(html).toContain("Cerrada");
    expect(html).toContain("Resuelto");
  });
});

describe("resolvePushUiState", () => {
  it("reports no browser support while rendering on the server", () => {
    // Hydration contract: the server can only ever produce "hidden", and the
    // client's first pass must reproduce it (pushUiSupported starts false and
    // is resolved in an effect after mount), otherwise React reports a
    // hydration mismatch on the inbox.
    expect(isPushOptInSupported()).toBe(false);
    expect(
      resolvePushUiState({
        supported: isPushOptInSupported(),
        serverKeyConfigured: false,
        permission: null,
        subscribed: false,
      })
    ).toBe("hidden");
  });

  it("stays hidden until the VAPID public key is configured", () => {
    expect(
      resolvePushUiState({
        supported: true,
        serverKeyConfigured: false,
        permission: "default",
        subscribed: false,
      })
    ).toBe("hidden");
  });

  it("maps a denied permission to the blocked notice", () => {
    expect(
      resolvePushUiState({
        supported: true,
        serverKeyConfigured: true,
        permission: "denied",
        subscribed: false,
      })
    ).toBe("blocked");
  });

  it("reflects the subscription flag when everything else is ready", () => {
    expect(
      resolvePushUiState({
        supported: true,
        serverKeyConfigured: true,
        permission: "granted",
        subscribed: false,
      })
    ).toBe("off");
    expect(
      resolvePushUiState({
        supported: true,
        serverKeyConfigured: true,
        permission: "granted",
        subscribed: true,
      })
    ).toBe("on");
  });
});

describe("PushOptInControl", () => {
  it("renders nothing while the state is hidden", () => {
    expect(
      renderToStaticMarkup(
        <PushOptInControl state="hidden" busy={false} onEnable={noop} onDisable={noop} />
      )
    ).toBe("");
  });

  it("offers the enable action when the browser is capable but unsubscribed", () => {
    const html = renderToStaticMarkup(
      <PushOptInControl state="off" busy={false} onEnable={noop} onDisable={noop} />
    );
    expect(html).toContain("Activar notificaciones");
    expect(html).toContain('type="button"');
  });

  it("offers the disable action while subscribed", () => {
    const html = renderToStaticMarkup(
      <PushOptInControl state="on" busy={false} onEnable={noop} onDisable={noop} />
    );
    expect(html).toContain("Desactivar notificaciones");
  });

  it("explains a blocked permission instead of showing an action", () => {
    const html = renderToStaticMarkup(
      <PushOptInControl state="blocked" busy={false} onEnable={noop} onDisable={noop} />
    );
    expect(html).toContain("notificaciones están bloqueadas");
    expect(html).not.toContain("<button");
  });
});
