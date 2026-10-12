import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import es from "@/messages/es.json";
import en from "@/messages/en.json";
import type { Dictionary } from "@/lib/i18n";
import { CHAT_MESSAGE_BODY_MAX_LENGTH } from "@/lib/chat/types";
import {
  computeEntryErrors,
  mergeThreadMessages,
  newClientMessageId,
  nextChatReconnectDelayMs,
  resolveComposerKeyAction,
  shouldPollVisitorHistory,
  type ChatThreadMessage,
} from "@/lib/chat/visitor-view-utils";
import HelpMenu from "./HelpMenu";
import {
  ChatComposer,
  ChatEntryForm,
  ChatNotice,
  ChatThread,
} from "./ChatView";

/**
 * Component/behaviour tests for the HelpHub visitor chat view.
 *
 * The project runs Vitest in a `node` environment without a DOM library, so
 * these tests combine (a) `react-dom/server` static markup for the
 * presentational pieces and (b) direct unit tests of the exported pure helpers
 * that drive keyboard handling, validation and thread reconciliation.
 * Interactive behaviour that needs a real DOM is intentionally left to the
 * browser-level suite (WU-13).
 */

const dict = es as unknown as Dictionary;
const enDict = en as unknown as Dictionary;
const chatT = dict.helpHub.chat;

const noop = () => {};

function leafKeys(value: unknown): string[] {
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    typeof child === "object" && child !== null ? leafKeys(child).map((k) => `${key}.${k}`) : [key]
  );
}

describe("HelpHub menu regression", () => {
  const html = renderToStaticMarkup(<HelpMenu dict={dict} onNavigate={noop} />);

  it("offers the advisor chat entry and keeps the other HelpHub entries", () => {
    expect(html).toContain(dict.helpHub.menu.chat);
    for (const label of [
      dict.helpHub.menu.order,
      dict.helpHub.menu.faq,
      dict.helpHub.menu.privacy,
      dict.helpHub.menu.terms,
      dict.helpHub.menu.contact,
    ]) {
      expect(html).toContain(label);
    }
  });

  it("no longer exposes the WhatsApp entry inside the drawer menu", () => {
    expect(html).not.toContain(dict.helpHub.menu.whatsapp);
  });
});

describe("ChatEntryForm", () => {
  const html = renderToStaticMarkup(
    <ChatEntryForm
      t={chatT}
      lang="es"
      values={{ name: "", email: "", phone: "", marketingConsent: false }}
      errors={{}}
      submitting={false}
      formError={null}
      onChange={noop}
      onSubmit={noop}
    />
  );

  it("marks name and email as required and phone as optional", () => {
    expect(html.match(/required=""/g) ?? []).toHaveLength(2);
    expect(html).toContain('type="text"');
    expect(html).toContain('type="email"');
    expect(html).toContain('type="tel"');
  });

  it("renders the honest service-purpose copy and an unchecked marketing opt-in", () => {
    expect(html).toContain(chatT.servicePurpose);
    expect(html).toContain(chatT.marketingOptIn);
    expect(html).not.toContain('checked=""');
  });
});

describe("computeEntryErrors", () => {
  it("requires name and email while allowing an empty phone", () => {
    const errors = computeEntryErrors({ name: "", email: "", phone: "" });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeUndefined();
  });

  it("rejects an invalid email and an invalid phone", () => {
    const errors = computeEntryErrors({ name: "Ana", email: "not-an-email", phone: "abc" });
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });

  it("accepts a valid entry", () => {
    expect(
      computeEntryErrors({ name: "Ana", email: "ana@example.com", phone: "+57 300 123 4567" })
    ).toEqual({});
  });
});

describe("resolveComposerKeyAction", () => {
  it("sends on Enter and inserts a newline on Shift+Enter", () => {
    expect(resolveComposerKeyAction({ key: "Enter", shiftKey: false, isComposing: false })).toBe(
      "send"
    );
    expect(resolveComposerKeyAction({ key: "Enter", shiftKey: true, isComposing: false })).toBe(
      "newline"
    );
  });

  it("never sends while an IME composition is active", () => {
    expect(resolveComposerKeyAction({ key: "Enter", shiftKey: false, isComposing: true })).toBe(
      "newline"
    );
  });
});

describe("mergeThreadMessages", () => {
  it("deduplicates by id and keeps chronological order", () => {
    const first: ChatThreadMessage = {
      id: "1",
      senderType: "visitor",
      body: "a",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const second: ChatThreadMessage = {
      id: "2",
      senderType: "operator",
      body: "b",
      createdAt: "2026-01-01T00:01:00.000Z",
    };
    expect(mergeThreadMessages([second], [first, second]).map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("newClientMessageId", () => {
  it("returns an idempotency key accepted by the API schema", () => {
    expect(newClientMessageId()).toMatch(/^[A-Za-z0-9_-]{8,191}$/);
    expect(newClientMessageId()).not.toBe(newClientMessageId());
  });
});

describe("SSE reconnect/fallback helpers", () => {
  it("grows the reconnect delay with a bounded ceiling", () => {
    expect(nextChatReconnectDelayMs(0)).toBe(3_000);
    expect(nextChatReconnectDelayMs(1)).toBe(6_000);
    expect(nextChatReconnectDelayMs(2)).toBe(12_000);
    expect(nextChatReconnectDelayMs(100)).toBe(30_000);
    expect(nextChatReconnectDelayMs(Number.NaN)).toBe(3_000);
  });

  it("polls history only when visible and SSE is not connected", () => {
    expect(shouldPollVisitorHistory({ sseConnected: false, pageVisible: true })).toBe(true);
    expect(shouldPollVisitorHistory({ sseConnected: true, pageVisible: true })).toBe(false);
    expect(shouldPollVisitorHistory({ sseConnected: false, pageVisible: false })).toBe(false);
  });
});

describe("ChatThread", () => {
  it("renders message bodies as plain text with sender labels", () => {
    const html = renderToStaticMarkup(
      <ChatThread
        t={chatT}
        messages={[
          {
            id: "1",
            senderType: "operator",
            body: "<b>hola</b>",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
        pending={[]}
        status="assigned"
        online
        onRetry={noop}
      />
    );
    expect(html).toContain(chatT.operatorLabel);
    expect(html).toContain("&lt;b&gt;hola&lt;/b&gt;");
    expect(html).not.toContain("<b>hola</b>");
  });

  it("shows the waiting notice while no advisor has replied", () => {
    const html = renderToStaticMarkup(
      <ChatThread
        t={chatT}
        messages={[
          {
            id: "1",
            senderType: "visitor",
            body: "hi",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
        pending={[]}
        status="open"
        online
        onRetry={noop}
      />
    );
    expect(html).toContain(chatT.waiting);
  });

  it("shows the closed notice for a closed conversation", () => {
    const html = renderToStaticMarkup(
      <ChatThread t={chatT} messages={[]} pending={[]} status="closed" online onRetry={noop} />
    );
    expect(html).toContain(chatT.closedTitle);
  });
});

describe("ChatComposer", () => {
  it("shows the character counter and disables send while empty", () => {
    const html = renderToStaticMarkup(
      <ChatComposer
        t={chatT}
        value=""
        onChange={noop}
        onSend={noop}
        sending={false}
        disabled={false}
        maxLength={CHAT_MESSAGE_BODY_MAX_LENGTH}
      />
    );
    expect(html).toContain(`0/${CHAT_MESSAGE_BODY_MAX_LENGTH}`);
    expect(html).toContain('disabled=""');
  });
});

describe("ChatNotice", () => {
  it("explains the offline state", () => {
    const html = renderToStaticMarkup(<ChatNotice t={chatT} variant="offline" />);
    expect(html).toContain(chatT.offlineTitle);
    expect(html).toContain(chatT.offlineText);
  });

  it("offers WhatsApp and contact fallbacks when chat is unavailable", () => {
    const html = renderToStaticMarkup(
      <ChatNotice
        t={chatT}
        variant="unavailable"
        whatsappAvailable
        onOpenWhatsApp={noop}
        onOpenContact={noop}
      />
    );
    expect(html).toContain(chatT.whatsappFallback);
    expect(html).toContain(chatT.contactFallback);
  });

  it("offers a reload action on error", () => {
    const html = renderToStaticMarkup(<ChatNotice t={chatT} variant="error" onRetry={noop} />);
    expect(html).toContain(chatT.loadRetry);
  });
});

describe("chat i18n parity", () => {
  it("keeps the chat, resume and metadata chat keys aligned", () => {
    expect(leafKeys(enDict.helpHub.chat).sort()).toEqual(leafKeys(chatT).sort());
    expect(leafKeys(enDict.helpHub.resume).sort()).toEqual(leafKeys(dict.helpHub.resume).sort());
    expect(leafKeys(enDict.metadata.chat).sort()).toEqual(leafKeys(dict.metadata.chat).sort());
    expect(enDict.helpHub.menu.chat).toBeTruthy();
  });
});
