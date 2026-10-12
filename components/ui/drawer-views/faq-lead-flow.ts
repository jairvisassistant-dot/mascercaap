import { useCallback, useRef } from "react";
import type { FormEvent } from "react";

import type { Locale } from "@/lib/i18n";
import { trackHelpHubEvent } from "@/lib/help-hub-analytics";
import { buildHandoffSummary } from "@/lib/handoff-summary";
import {
  buildFaqWhatsAppConversationText,
  buildFaqWhatsAppLinks,
  type FaqChatMessage,
  type FaqLeadData,
} from "./faq-chat-utils";

/**
 * Lead-capture flow for the FAQ assistant.
 *
 * Owns the pending WhatsApp handoff (kept when the lead save fails so the
 * visitor can continue anyway) and the submit/skip handlers, leaving the view
 * component free of fetch and analytics plumbing.
 */

type UseFaqLeadFlowOptions = {
  messages: FaqChatMessage[];
  leadData: FaqLeadData;
  leadConsent: boolean;
  locale: Locale;
  product: string | null | undefined;
  onWhatsAppConnect: (appUrl: string | null, webUrl: string | null, leadSaved: boolean) => void;
  onLeadDone: () => void;
  onLeadSaveError: (value: boolean) => void;
};

type WhatsAppLinks = { appUrl: string | null; webUrl: string | null };

export function useFaqLeadFlow({
  messages,
  leadData,
  leadConsent,
  locale,
  product,
  onWhatsAppConnect,
  onLeadDone,
  onLeadSaveError,
}: UseFaqLeadFlowOptions) {
  const pendingWhatsAppRef = useRef<WhatsAppLinks | null>(null);

  const buildConnectUrls = useCallback(
    (message: string): WhatsAppLinks => buildFaqWhatsAppLinks(message),
    []
  );

  const handleLeadSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!leadConsent || !leadData.nombre.trim() || !leadData.tipo) return;
      onLeadSaveError(false);
      pendingWhatsAppRef.current = null;

      const { appUrl, webUrl } = buildConnectUrls(
        buildFaqWhatsAppConversationText(messages, leadData, product)
      );

      let leadSaved = false;
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: leadData.nombre.trim(),
            email: leadData.email.trim() || null,
            tipo: leadData.tipo,
            producto_interes: product ?? null,
            preguntas_bot: messages.flatMap((m) =>
              m.role === "user" && m.id !== "welcome" ? [m.text] : []
            ),
            resumen_handoff: buildHandoffSummary(messages, {
              nombre: leadData.nombre.trim(),
              email: leadData.email.trim() || null,
              tipo: leadData.tipo,
              producto_interes: product ?? null,
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
        onLeadSaveError(true);
        pendingWhatsAppRef.current = { appUrl, webUrl };
        return;
      }

      onLeadDone();
      trackHelpHubEvent("helphub_whatsapp_opened", {
        source: "lead_submit",
        locale,
        destination: appUrl ? "app" : webUrl ? "web" : "unavailable",
        lead_saved: leadSaved,
      });
      onWhatsAppConnect(appUrl, webUrl, leadSaved);
    },
    [buildConnectUrls, leadConsent, leadData, locale, messages, onLeadDone, onLeadSaveError, onWhatsAppConnect, product]
  );

  const handleLeadContinueAnyway = useCallback(() => {
    if (!pendingWhatsAppRef.current) return;
    const { appUrl, webUrl } = pendingWhatsAppRef.current;
    onLeadDone();
    pendingWhatsAppRef.current = null;
    trackHelpHubEvent("helphub_whatsapp_opened", {
      source: "lead_submit_error_continue",
      locale,
      destination: appUrl ? "app" : webUrl ? "web" : "unavailable",
      lead_saved: false,
    });
    onWhatsAppConnect(appUrl, webUrl, false);
  }, [locale, onLeadDone, onWhatsAppConnect]);

  const handleLeadSkip = useCallback(() => {
    const { appUrl, webUrl } = buildConnectUrls(buildFaqWhatsAppConversationText(messages, undefined, product));
    onLeadDone();
    trackHelpHubEvent("helphub_whatsapp_opened", {
      source: "lead_skip",
      locale,
      destination: appUrl ? "app" : webUrl ? "web" : "unavailable",
      lead_saved: false,
    });
    onWhatsAppConnect(appUrl, webUrl, false);
  }, [buildConnectUrls, locale, messages, onLeadDone, onWhatsAppConnect, product]);

  return { handleLeadSubmit, handleLeadSkip, handleLeadContinueAnyway };
}
