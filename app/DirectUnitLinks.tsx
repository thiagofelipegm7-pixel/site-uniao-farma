"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "./analytics";
import { scheduleAutoLocation } from "./auto-location";
import {
  formatDistance,
  rankUnitsByDistance,
  type RankedUnit,
} from "./geo";
import { IntentIcon } from "./IntentIcons";
import { rankUnitsInWorker } from "./inp-worker-client";
import { recordMetric } from "./metrics";
import { readPreferredUnitId, sortUnitsByPreference, writePreferredUnitId } from "./preferred-unit";
import { buildWhatsAppUrl, UNITS, type Unit } from "./site-config";
import UnitStatusBadge from "./UnitStatusBadge";
import { WHATSAPP_MESSAGES, type WhatsAppIntentKey } from "./whatsapp-messages";

type DirectUnitLinksProps = {
  message: string;
  intent: string;
  source: string;
  heading?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

type LocateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "ready"; ranked: RankedUnit[]; fromCache: boolean };

function resolveMessage(message: string, unitName: string): string {
  return message.replaceAll("{unidade}", unitName);
}

function defaultIntent(intent: string): WhatsAppIntentKey {
  if (intent === "delivery_inquiry") return "delivery";
  if (intent === "enviar_receita") return "recipe";
  return "product";
}

export default function DirectUnitLinks({
  message,
  intent,
  source,
  heading = "Escolha a loja e peça",
  description = "A conversa já abre pronta no WhatsApp.",
  compact = false,
  className = "",
}: DirectUnitLinksProps) {
  const [locate, setLocate] = useState<LocateState>({ status: "idle" });
  const [preferredId, setPreferredId] = useState<Unit["id"] | null>(null);
  const activeIntent = defaultIntent(intent);

  const selectedMessage =
    WHATSAPP_MESSAGES[activeIntent] ||
    (message.includes("___") ? WHATSAPP_MESSAGES.product : message);

  const units = useMemo(() => {
    if (locate.status === "ready") return locate.ranked.map((item) => item.unit);
    return sortUnitsByPreference(UNITS, preferredId);
  }, [locate, preferredId]);

  const nearest = locate.status === "ready" ? locate.ranked[0] : null;
  const distances = locate.status === "ready"
    ? Object.fromEntries(locate.ranked.map((item) => [item.unit.id, item.distanceKm]))
    : {};

  function rememberUnit(id: Unit["id"]) {
    writePreferredUnitId(id);
    setPreferredId(id);
  }

  function logWhatsApp(unitId: Unit["id"], clickIntent: string, placement: string) {
    recordMetric({ unit: unitId, intent: clickIntent, source: `${source}_${placement}` });
    trackEvent("whatsapp_click", { unit: unitId, intent: clickIntent, source, placement });
  }

  async function applyOrigin(origin: { latitude: number; longitude: number }, fromCache: boolean) {
    const offThread = await rankUnitsInWorker(origin, UNITS);
    const ranked: RankedUnit[] = offThread.length
      ? offThread.flatMap((item) => {
          const unit = UNITS.find((entry) => entry.id === item.id);
          return unit ? [{ unit, distanceKm: item.distanceKm }] : [];
        })
      : rankUnitsByDistance(origin);
    setLocate({ status: "ready", ranked, fromCache });
    return ranked;
  }

  useEffect(() => {
    setPreferredId(readPreferredUnitId());
    const stop = scheduleAutoLocation((origin) => {
      void applyOrigin(origin, true);
    });
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionLabel =
    activeIntent === "recipe" ? "Receita" : activeIntent === "delivery" ? "Entrega" : "WhatsApp";

  return (
    <div className={`direct-unit-links ${compact ? "direct-unit-links-compact" : ""} ${className}`.trim()}>
      {!compact ? (
        <div className="direct-unit-links-copy">
          <strong>{heading}</strong>
          <span>{description}</span>
        </div>
      ) : null}

      <div className="direct-unit-links-grid">
        {units.map((unit: Unit) => {
          const km = distances[unit.id];
          const isNearest = nearest?.unit.id === unit.id;
          const isPreferred = preferredId === unit.id;

          return (
            <article
              key={unit.id}
              data-unit={unit.id}
              className={`direct-unit-link${isNearest ? " is-nearest" : ""}${isPreferred && !isNearest ? " is-preferred" : ""}`}
            >
              <span className="direct-unit-name">{unit.shortName}</span>
              <span className="direct-unit-neighborhood">{unit.shortAddress}</span>
              {typeof km === "number" ? <span className="direct-unit-distance">{formatDistance(km)}</span> : null}
              {isNearest ? <span className="nearest-unit-badge">Mais próxima</span> : null}
              {isPreferred && !isNearest ? <span className="preferred-unit-badge">Sua loja</span> : null}
              <UnitStatusBadge unit={unit} />
              <div className="direct-unit-actions">
                <a
                  href={buildWhatsAppUrl(unit, resolveMessage(selectedMessage, unit.shortName), {
                    campaign: source,
                    content: `${source}_${unit.id}_${activeIntent}`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    rememberUnit(unit.id);
                    if (activeIntent === "delivery") {
                      trackEvent("delivery_inquiry", { unit: unit.id, source, placement: "direct_links" });
                    }
                    trackEvent("unit_selection", { unit: unit.id, intent: activeIntent, source, placement: "direct_links" });
                    logWhatsApp(unit.id, activeIntent, "direct_links");
                  }}
                >
                  <IntentIcon intent={activeIntent} /> {actionLabel}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
