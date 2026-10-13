"use client";

import { useEffect, useRef, useState } from "react";

import type { Dictionary, Locale } from "@/lib/i18n";
import { useHelpHub } from "@/lib/help-hub-context";
import {
  resolveResumePanelState,
  type ResumePanelState,
  type ResumeStatus,
} from "@/lib/chat/resume-utils";

/**
 * Client shell for `/[lang]/chat` resume redemption.
 *
 * The opaque `k` token is redeemed through a Server Action supplied by the page
 * (never client-side), so the visitor session cookie is set by the server. The
 * token is held only in component state for the lifetime of the request and is
 * never written to `localStorage`, `sessionStorage`, cookies, or any log.
 *
 * Invalid, expired, revoked and purged tokens are indistinguishable here: the
 * action resolves to a single generic failure and this shell renders one generic
 * error. On success the HelpHub drawer opens directly on the chat view.
 */

/** Shape of the server action that redeems the opaque resume token. */
type ResumeRedeemResult = { readonly ok: boolean };

type ChatResumePanelProps = {
  t: Dictionary["helpHub"]["resume"];
  lang: Locale;
  state: ResumePanelState;
  onOpenChat?: () => void;
};

export function ChatResumePanel({ t, lang, state, onOpenChat }: ChatResumePanelProps) {
  if (state.kind === "pending") {
    return (
      <p role="status" className="text-sm text-text-muted">
        {t.pending}
      </p>
    );
  }

  if (state.kind === "ok") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-text-sub">{t.successTitle}</h1>
        <p className="text-sm text-text-muted leading-relaxed">{t.successText}</p>
        <button
          type="button"
          onClick={onOpenChat}
          className="inline-flex items-center justify-center text-sm py-2.5 px-5 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
        >
          {t.openChat}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold text-text-sub">{t.errorTitle}</h1>
      <p className="text-sm text-text-muted leading-relaxed">{t.errorText}</p>
      <a href={`/${lang}`} className="text-sm font-semibold text-primary underline">
        {t.backHome}
      </a>
    </div>
  );
}

type Props = {
  dict: Dictionary;
  lang: Locale;
  token: string;
  redeem: (token: string) => Promise<ResumeRedeemResult>;
};

export default function ChatResumeClient({ dict, lang, token, redeem }: Props) {
  const t = dict.helpHub.resume;
  const { openDrawer } = useHelpHub();
  const [status, setStatus] = useState<ResumeStatus>(() =>
    token.trim() === "" ? "error" : "pending"
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (token.trim() === "") return;

    let active = true;
    redeem(token)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          // Drop the opaque token from the address bar once it has been spent.
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", window.location.pathname);
          }
          setStatus("ok");
          openDrawer("chat");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [openDrawer, redeem, token]);

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <div className="rounded-2xl border border-border-soft bg-surface-card shadow-sm p-6">
        <ChatResumePanel
          t={t}
          lang={lang}
          state={resolveResumePanelState({ token, status })}
          onOpenChat={() => openDrawer("chat")}
        />
      </div>
    </div>
  );
}
