type HelpHubEventName =
  | "helphub_whatsapp_cta_clicked"
  | "helphub_faq_no_match"
  | "helphub_advisor_cta_clicked"
  | "helphub_lead_submit_result"
  | "helphub_whatsapp_opened";

type HelpHubEventPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackHelpHubEvent(eventName: HelpHubEventName, payload: HelpHubEventPayload = {}) {
  if (typeof window === "undefined") return;

  const event = {
    event: eventName,
    ...payload,
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event);
  }

  window.dispatchEvent(new CustomEvent("helphub:track", { detail: event }));
}
