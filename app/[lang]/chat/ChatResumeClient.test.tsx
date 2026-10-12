import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import es from "@/messages/es.json";
import type { Dictionary } from "@/lib/i18n";
import { resolveResumePanelState } from "@/lib/chat/resume-utils";
import { ChatResumePanel } from "./ChatResumeClient";

/**
 * Behaviour tests for the `/[lang]/chat` resume experience.
 *
 * Redemption itself is a server action exercised at the API/DB boundary; these
 * tests cover the client-visible contract: a missing or failed token always
 * resolves to the same generic, non-enumerating error, and a redeemed token
 * offers to open the conversation.
 */

const dict = es as unknown as Dictionary;
const t = dict.helpHub.resume;

describe("resolveResumePanelState", () => {
  it("treats a missing or blank token as the generic error state", () => {
    expect(resolveResumePanelState({ token: "", status: "idle" })).toEqual({ kind: "error" });
    expect(resolveResumePanelState({ token: "   ", status: "idle" })).toEqual({ kind: "error" });
  });

  it("maps the redeem lifecycle to a panel state", () => {
    expect(resolveResumePanelState({ token: "abc", status: "idle" })).toEqual({ kind: "pending" });
    expect(resolveResumePanelState({ token: "abc", status: "pending" })).toEqual({ kind: "pending" });
    expect(resolveResumePanelState({ token: "abc", status: "ok" })).toEqual({ kind: "ok" });
    expect(resolveResumePanelState({ token: "abc", status: "error" })).toEqual({ kind: "error" });
  });
});

describe("ChatResumePanel", () => {
  it("shows a single generic non-enumerating error for a failed or missing link", () => {
    const html = renderToStaticMarkup(
      <ChatResumePanel t={t} lang="es" state={{ kind: "error" }} />
    );
    expect(html).toContain(t.errorTitle);
    expect(html).toContain(t.errorText);
  });

  it("offers to open the conversation once the token is redeemed", () => {
    const html = renderToStaticMarkup(
      <ChatResumePanel t={t} lang="es" state={{ kind: "ok" }} onOpenChat={() => {}} />
    );
    expect(html).toContain(t.successTitle);
    expect(html).toContain(t.openChat);
  });
});
