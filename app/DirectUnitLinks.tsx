"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "./analytics";
import { scheduleAutoLocation } from "./auto-location";
import {
  formatDistance,
  isFarFromCoverage,
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

function WhatsAppIcon() {
  return <img src="/whatsapp-icon.svg" alt="" width="20" height="20" aria-hidden="true" />;
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
  const [activeIntent, setActiveIntent] = useState<WhatsAppIntentKey>(defaultIntent(intent));

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
    return scheduleAutoLocation((origin) => {
      void applyOrigin(origin, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionLabel =
    activeIntent === "recipe" ? "Receita" : activeIntent === "delivery" ? "Entrega" : "Pedir";

  return (
    <div className={`direct-unit-links ${compact ? "direct-unit-links-compact" : ""} ${className}`.trim()}>
      {!compact ? (
        <div className="direct-unit-links-copy">
          <strong>{heading}</strong>
          <span>{description}</span>
        </div>
      ) : null}

      {!compact ? (
        <div className="whatsapp-intent-chips" role="tablist" aria-label="O que você precisa">
          {(
            [
              ["product", "Produto"],
              ["recipe", "Receita"],
              ["delivery", "Entrega"],
            ] as Array<[WhatsAppIntentKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeIntent === key}
              className={activeIntent === key ? "is-active" : ""}
              onClick={() => {
                setActiveIntent(key);
                trackEvent("whatsapp_intent_select", { intent: key, source });
              }}
            >
              <IntentIcon intent={key} />
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="locate-unit-bar">
        <div className="locate-unit-actions">
          {nearest ? (
            <a
              className="locate-unit-whatsapp"
              href={buildWhatsAppUrl(nearest.unit, resolveMessage(selectedMessage, nearest.unit.shortName), {
                campaign: source,
                content: `${source}_${nearest.unit.id}_nearest_${activeIntent}`,
              })}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                rememberUnit(nearest.unit.id);
                logWhatsApp(nearest.unit.id, activeIntent, "nearest_unit");
              }}
            >
              <WhatsAppIcon /> {actionLabel} agora
            </a>
          ) : (
            <p className="locate-unit-status">Localizando a loja mais próxima…</p>
          )}
        </div>
        <p className="locate-unit-status">
          {locate.status === "denied"
            ? "Escolha a loja pelo bairro."
            : locate.status === "unavailable"
              ? "Escolha a unidade manualmente."
              : nearest && isFarFromCoverage(nearest.distanceKm)
                ? `Mais próxima no mapa: ${nearest.unit.shortName}.`
                : nearest
                  ? `${nearest.unit.shortName} · ${formatDistance(nearest.distanceKm)}`
                  : preferredId
                    ? "Sua loja já aparece primeiro."
                    : "Permita a localização para ordenar as lojas."}
        </p>
      </div>

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
                {activeIntent !== "recipe" ? (
                  <a
                    className="direct-unit-recipe"
                    href={buildWhatsAppUrl(unit, resolveMessage(WHATSAPP_MESSAGES.recipe, unit.shortName), {
                      campaign: source,
                      content: `${source}_${unit.id}_receita`,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      rememberUnit(unit.id);
                      logWhatsApp(unit.id, "recipe", "direct_links_recipe");
                    }}
                  >
                    <IntentIcon intent="recipe" /> Receita
                  </a>
                ) : (
                  <a
                    className="direct-unit-recipe"
                    href={buildWhatsAppUrl(unit, resolveMessage(WHATSAPP_MESSAGES.product, unit.shortName), {
                      campaign: source,
                      content: `${source}_${unit.id}_produto`,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      rememberUnit(unit.id);
                      logWhatsApp(unit.id, "product", "direct_links");
                    }}
                  >
                    <IntentIcon intent="product" /> Produto
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
