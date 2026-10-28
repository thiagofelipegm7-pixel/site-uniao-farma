import { getCampaignAttribution } from "./campaign-attribution";
import { UNITS } from "./site-config";

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

export type GaStore = "fatima" | "nacoes_unidas" | "itacolomi" | "geral";

const STORE_BY_UNIT_ID: Record<string, GaStore> = {
  fatima: "fatima",
  nacoes: "nacoes_unidas",
  itacolomi: "itacolomi",
};

function storeFromUnitId(unitId: unknown): GaStore | null {
  return typeof unitId === "string" ? STORE_BY_UNIT_ID[unitId] ?? null : null;
}

/** Descobre a loja pelo número do link (wa.me ou tel:). "geral" se não for de uma loja. */
export function storeFromHref(href: string): GaStore {
  const digits = href.replace(/^tel:/, "").replace(/\D/g, "");
  for (const unit of UNITS) {
    const phones = [unit.whatsappDigits, unit.phoneLink.replace(/\D/g, ""), ...(unit.extraPhones ?? []).map((p) => p.phoneLink.replace(/\D/g, ""))];
    if (phones.some((phone) => phone && digits.includes(phone))) return STORE_BY_UNIT_ID[unit.id];
  }
  return "geral";
}

function isWhatsAppHref(href: string): boolean {
  return /^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(href);
}

function linkLocation(element: Element): string {
  const el = element as HTMLElement;
  const explicit = el.dataset.trackPlacement || el.dataset.trackSource;
  if (explicit) return explicit;
  if (el.closest(".whatsapp-fab, [class*='whatsapp-fab']")) return "whatsapp_fab";
  const region = el.closest("header, footer, nav, section[id], main");
  if (!region) return "pagina";
  return region.id ? `${region.tagName.toLowerCase()}#${region.id}` : region.tagName.toLowerCase();
}

/** Lê um clique e devolve evento + parâmetros GA4 (data-track-* e links wa.me/tel: sem atributo). */
export function getClickTrackingParams(target: Element | null): { event: string; params: TrackingParams } | null {
  const tracked = target?.closest<HTMLElement>("[data-track-event]");
  const anchor = target?.closest<HTMLAnchorElement>("a[href]");
  let eventName = tracked?.dataset.trackEvent;
  const params: TrackingParams = {};
  if (tracked) {
    for (const [key, value] of Object.entries(tracked.dataset)) {
      if (key.startsWith("track") && key !== "trackEvent") {
        const paramName = key.slice("track".length).replace(/^[A-Z]/, (letter) => letter.toLowerCase());
        if (paramName) params[paramName] = value;
      }
    }
  }
  const href = (anchor ?? (tracked as HTMLAnchorElement | undefined))?.getAttribute?.("href") ?? "";
  if (!eventName && anchor) {
    if (isWhatsAppHref(href)) eventName = "whatsapp_click";
    else if (href.startsWith("tel:")) eventName = "phone_click";
  }
  if (!eventName) return null;
  if (eventName === "whatsapp_click" || eventName === "phone_click") {
    const fromUnit = storeFromUnitId(params.unit);
    params.store = fromUnit ?? (href ? storeFromHref(href) : "geral");
    params.link_location = linkLocation(tracked ?? anchor!);
  }
  return { event: eventName, params };
}

const recentEvents = new Map<string, number>();

export function trackEvent(event: string, params: TrackingParams = {}): void {
  if (typeof window === "undefined") return;

  const trackingWindow = window as TrackingWindow;

  const store = params.store ?? storeFromUnitId(params.unit) ?? undefined;
  if (event === "whatsapp_click" || event === "phone_click") {
    // Evita contar duas vezes quando o link e um onClick disparam o mesmo clique.
    const key = `${event}:${String(store ?? "")}`;
    const now = Date.now();
    if (now - (recentEvents.get(key) ?? 0) < 1000) return;
    recentEvents.set(key, now);
  }

  trackingWindow.dataLayer = trackingWindow.dataLayer || [];
  const eventParams: TrackingParams = {
    ...params,
    ...(store ? { store } : {}),
    ...(event === "whatsapp_click" || event === "phone_click"
      ? { link_location: params.link_location ?? params.placement ?? params.source ?? "pagina" }
      : {}),
    ...getCampaignAttribution(),
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
  };
  // gtag empurra no dataLayer sozinho. O consentimento (Consent Mode v2) decide se usa cookies.
  if (trackingWindow.gtag) trackingWindow.gtag("event", event, eventParams);
  else trackingWindow.dataLayer.push({ event, ...eventParams });
  // Meta Pixel só depois do aceite do banner.
  if (trackingWindow.__uniaoFarmaAnalyticsLoaded) trackingWindow.fbq?.("trackCustom", event, eventParams);

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
