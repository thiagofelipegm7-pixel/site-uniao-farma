"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { trackEvent } from "./analytics";
import { captureCampaignAttribution } from "./campaign-attribution";

const CONSENT_KEY = "uniao_farma_cookie_consent_v1";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-1N8E5G39KF";
const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ?? "GTM-M8BXJCHB";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";
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
  trackingWindow.dataLayer.push({
    "gtm.start": Date.now(),
    event: "gtm.js",
  });
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

  // Use GTM as the single Google loader when a container is configured. If it
  // is not configured, keep the existing direct GA4 integration as fallback.
  if (GTM_CONTAINER_ID) {
    startGoogleTagManager();
  } else {
    trackingWindow.gtag = (...args: unknown[]) => {
      trackingWindow.dataLayer?.push(args);
    };
    trackingWindow.gtag("js", new Date());
    trackingWindow.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true,
    });
    if (GOOGLE_ADS_ID) trackingWindow.gtag("config", GOOGLE_ADS_ID);
    appendScript(
      "uniao-farma-ga4",
      `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
    );
  }

  if (!trackingWindow.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(args);
      }
    } as NonNullable<TrackingWindow["fbq"]>;

    if (fbq) {
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.push = fbq;
      trackingWindow.fbq = fbq;
      trackingWindow._fbq = fbq;
    }
  }

  appendScript("uniao-farma-meta-pixel", "https://connect.facebook.net/pt_BR/fbevents.js");
  trackingWindow.fbq?.("init", META_PIXEL_ID);
  trackingWindow.fbq?.("track", "PageView");
  trackingWindow.dataLayer.push({
    event: "consent_update",
    consent_status: "granted",
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

export default function AnalyticsConsent() {
  // Read browser-only consent after hydration so the server and first client
  // render stay identical.
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const storedConsent = window.localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
    setConsent(storedConsent);
    captureCampaignAttribution();
  }, []);

  useEffect(() => {
    if (consent === "accepted") startAnalytics();
  }, [consent]);

  const showBanner = hydrated && (consent === null || showPreferences);

  useEffect(() => {
    if (consent !== "accepted") return;

    const onTrackedClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const element = target?.closest<HTMLElement>("[data-track-event]");
      const eventName = element?.dataset.trackEvent;
      if (!eventName) return;

      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(element.dataset)) {
        if (key.startsWith("track") && key !== "trackEvent") {
          const paramName = key
            .slice("track".length)
            .replace(/^[A-Z]/, (letter) => letter.toLowerCase());
          if (paramName) params[paramName] = value;
        }
      }
      trackEvent(eventName, params);
    };

    document.addEventListener("click", onTrackedClick);
    return () => document.removeEventListener("click", onTrackedClick);
  }, [consent]);

  const saveConsent = (value: ConsentValue) => {
    const hadAccepted = consent === "accepted";

    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setShowPreferences(false);

    if (value === "accepted") {
      startAnalytics();
      return;
    }

    if (hadAccepted) {
      window.location.reload();
    }
  };

  return (
    <>
      {showBanner && (
        <section className="cookie-banner" aria-label="Preferências de cookies">
          <div>
            <strong>Privacidade e cookies</strong>
            <p>
              Cookies opcionais nos ajudam a melhorar o site e só são ativados com sua autorização. Leia a{" "}
              <a href="/privacidade">Política de Privacidade</a>.
            </p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="cookie-reject" onClick={() => saveConsent("rejected")}>
              Rejeitar opcionais
            </button>
            <button type="button" className="cookie-accept" onClick={() => saveConsent("accepted")}>
              Aceitar
            </button>
          </div>
        </section>
      )}

      {!showBanner && consent && (
        <button
          type="button"
          className="cookie-manage-button"
          onClick={() => setShowPreferences(true)}
          aria-label="Gerenciar preferências de cookies"
        >
          Cookies
        </button>
      )}
    </>
  );
}
