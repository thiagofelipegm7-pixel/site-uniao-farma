import { getCampaignAttribution } from "./campaign-attribution";

export type TrackingParams = Record<string, unknown>;

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
const GOOGLE_ADS_LABELS: Record<string, string> = {
  whatsapp_click: process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL || "",
  phone_click: process.env.NEXT_PUBLIC_GOOGLE_ADS_PHONE_LABEL || "",
  delivery_inquiry: process.env.NEXT_PUBLIC_GOOGLE_ADS_DELIVERY_LABEL || "",
};

type TrackingWindow = Window & {
  dataLayer?: Array<Record<string, unknown> | unknown[]>;
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  __uniaoFarmaAnalyticsLoaded?: boolean;
};

export function trackEvent(event: string, params: TrackingParams = {}): void {
  if (typeof window === "undefined") return;

  const trackingWindow = window as TrackingWindow;
  if (!trackingWindow.__uniaoFarmaAnalyticsLoaded) return;

  trackingWindow.dataLayer = trackingWindow.dataLayer || [];
  const eventParams = {
    ...params,
    ...getCampaignAttribution(),
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
  };
  trackingWindow.dataLayer.push({ event, ...eventParams });
  trackingWindow.gtag?.("event", event, eventParams);
  trackingWindow.fbq?.("trackCustom", event, eventParams);

  const conversionLabel = GOOGLE_ADS_LABELS[event];
  if (!GOOGLE_ADS_ID || !conversionLabel) return;

  const sendTo = `${GOOGLE_ADS_ID}/${conversionLabel}`;
  if (trackingWindow.gtag) {
    trackingWindow.gtag("event", "conversion", {
      send_to: sendTo,
      ...eventParams,
    });
    return;
  }

  // With GTM, the container can use this event to fire one Google Ads
  // conversion tag without loading a second Google tag on the site.
  trackingWindow.dataLayer.push({
    event: "google_ads_conversion",
    source_event: event,
    send_to: sendTo,
    ...eventParams,
  });
}
