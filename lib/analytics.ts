export type AnalyticsEvent =
  | "page_view"
  | "cta_whatsapp"
  | "helphub_open"
  | "product_view"
  | "contact_form_submit";

export type EventProperties = Record<string, string | number | boolean | null>;

/**
 * Fire-and-forget event to /api/track.
 * No cookies, no third-party scripts, no consent banner required.
 * Safe to call from any client component — never throws, never blocks UX.
 */
export function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (typeof window === "undefined") return;
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: event,
      page: window.location.pathname,
      referrer: document.referrer || undefined,
      properties: properties ?? {},
    }),
    keepalive: true,
  }).catch(() => {});
}
