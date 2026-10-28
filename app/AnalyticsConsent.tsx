"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getClickTrackingParams, trackEvent } from "./analytics";
import { captureCampaignAttribution } from "./campaign-attribution";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "./cookie-preferences";

import { CONSENT_STORAGE_KEY as CONSENT_KEY } from "./ga-bootstrap";

// GA4 (gtag.js) é carregado direto no <head> pelo layout, com Consent Mode v2.
// O GTM só carrega se NEXT_PUBLIC_GTM_CONTAINER_ID for definido de propósito
// (e o contêiner NÃO deve ter tag GA4, para não contar page_view em dobro).
const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ?? "";
const META_PIXEL_ID = "1566333861510486";

type ConsentValue = "accepted" | "rejected";

type TrackingWindow = Window & {
  dataLayer?: Array<Record<string, unknown> | unknown[]>;
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[];
    loaded?: boolean;
    version?: string;
    push?: (...args: unknown[]) => void;
  };
  _fbq?: TrackingWindow["fbq"];
  __uniaoFarmaAnalyticsLoaded?: boolean;
};

function appendScript(id: string, src: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function startGoogleTagManager(): void {
  if (!GTM_CONTAINER_ID || document.getElementById("uniao-farma-gtm")) return;
  const trackingWindow = window as TrackingWindow;
  trackingWindow.dataLayer = trackingWindow.dataLayer || [];
  trackingWindow.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  appendScript(
    "uniao-farma-gtm",
    `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_CONTAINER_ID)}`,
  );
}

function startAnalytics(): void {
  const trackingWindow = window as TrackingWindow;
  if (trackingWindow.__uniaoFarmaAnalyticsLoaded) return;
  trackingWindow.__uniaoFarmaAnalyticsLoaded = true;
  trackingWindow.dataLayer = trackingWindow.dataLayer || [];
  trackingWindow.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  if (GTM_CONTAINER_ID) startGoogleTagManager();
  if (!trackingWindow.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    } as NonNullable<TrackingWindow["fbq"]>;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    trackingWindow.fbq = fbq;
    trackingWindow._fbq = fbq;
  }
  appendScript("uniao-farma-meta-pixel", "https://connect.facebook.net/pt_BR/fbevents.js");
  trackingWindow.fbq?.("init", META_PIXEL_ID);
  trackingWindow.fbq?.("track", "PageView");
}

function readStoredConsent(): ConsentValue | null {
  const stored = window.localStorage.getItem(CONSENT_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    // The consent value lives in browser storage and is intentionally hydrated after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readStoredConsent());
    captureCampaignAttribution();
  }, []);

  useEffect(() => {
    if (consent === "accepted") startAnalytics();
  }, [consent]);

  const showBanner = hydrated && (consent === null || showPreferences);

  useEffect(() => {
    document.body.classList.toggle("cookie-banner-visible", showBanner);
    return () => {
      document.body.classList.remove("cookie-banner-visible");
    };
  }, [showBanner]);

  useEffect(() => {
    const openPreferences = () => setShowPreferences(true);
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    // Cliques são medidos sempre. Sem consentimento, o gtag só envia pings sem cookies.
    const onTrackedClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const params = getClickTrackingParams(target);
      if (params) trackEvent(params.event, params.params);
    };
    document.addEventListener("click", onTrackedClick);
    return () => document.removeEventListener("click", onTrackedClick);
  }, []);

  const saveConsent = (value: ConsentValue) => {
    const hadAccepted = consent === "accepted";
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setShowPreferences(false);
    if (value === "accepted") {
      startAnalytics();
      return;
    }
    if (hadAccepted) window.location.reload();
  };

  return (
    <>
      {showBanner && (
        <section className="cookie-banner" aria-label="Preferências de cookies" role="region">
          <p className="cookie-copy">
            <strong>Cookies opcionais.</strong> Analytics só com autorização.{" "}
            <a href="/privacidade">Privacidade</a>
          </p>
          <div className="cookie-actions">
            <button type="button" className="cookie-reject" onClick={() => saveConsent("rejected")}>
              Recusar
            </button>
            <button type="button" className="cookie-accept" onClick={() => saveConsent("accepted")}>
              Aceitar
            </button>
          </div>
        </section>
      )}
    </>
  );
}
