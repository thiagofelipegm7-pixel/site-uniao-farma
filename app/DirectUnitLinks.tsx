"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "./analytics";
import {
  formatDistance,
  isFarFromCoverage,
  isFreshCache,
  rankUnitsByDistance,
  readCachedOrigin,
  writeCachedOrigin,
  type RankedUnit,
} from "./geo";
import { readPreferredUnitId, sortUnitsByPreference, writePreferredUnitId } from "./preferred-unit";
import { buildWhatsAppUrl, UNITS, type Unit } from "./site-config";
import UnitStatusBadge from "./UnitStatusBadge";

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

const recipeMessage =
  "Olá, União Farma {unidade}! Vou enviar a foto da receita (ou Memed). Pode o farmacêutico conferir?";

export default function DirectUnitLinks({
  message,
  intent,
  source,
  heading = "Escolha sua unidade e fale direto com a equipe",
  description = "Uma mensagem já pronta será aberta no WhatsApp da loja escolhida.",
  compact = false,
  className = "",
}: DirectUnitLinksProps) {
  const [locate, setLocate] = useState<LocateState>({ status: "idle" });
  const [preferredId, setPreferredId] = useState<Unit["id"] | null>(null);

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

  function applyOrigin(origin: { latitude: number; longitude: number }, fromCache: boolean) {
    const ranked = rankUnitsByDistance(origin);
    setLocate({ status: "ready", ranked, fromCache });
    return ranked;
  }

  function requestLocation(force = false) {
    if (!force) {
      const cached = readCachedOrigin();
      if (cached && isFreshCache(cached.savedAt)) {
        applyOrigin(cached, true);
        return;
      }
    }

    if (!navigator.geolocation) {
      const cached = readCachedOrigin();
      if (cached) {
        applyOrigin(cached, true);
        return;
      }
      setLocate({ status: "unavailable" });
      return;
    }

    setLocate({ status: "loading" });
    trackEvent("location_request", { source, placement: "direct_links", force });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = writeCachedOrigin(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          position.coords.accuracy,
        );
        const ranked = applyOrigin(origin, false);
        trackEvent("location_success", {
          source,
          nearest: ranked[0]?.unit.id,
          km: ranked[0] ? Number(ranked[0].distanceKm.toFixed(2)) : undefined,
          cached: false,
        });
      },
      (error) => {
        const cached = readCachedOrigin();
        if (cached) {
          const ranked = applyOrigin(cached, true);
          trackEvent("location_cache_fallback", {
            source,
            nearest: ranked[0]?.unit.id,
            code: error.code,
          });
          return;
        }

        setLocate({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" });
        trackEvent("location_error", { source, code: error.code });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: force ? 0 : 45 * 60 * 1000 },
    );
  }

  useEffect(() => {
    setPreferredId(readPreferredUnitId());
    const cached = readCachedOrigin();
    if (!cached) return;
    applyOrigin(cached, true);
    if (!isFreshCache(cached.savedAt)) requestLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`direct-unit-links ${compact ? "direct-unit-links-compact" : ""} ${className}`.trim()}>
      <div className="direct-unit-links-copy">
        <strong>{heading}</strong>
        <span>{description}</span>
      </div>

      <div className="locate-unit-bar">
        <p>Use sua localização para destacar a unidade mais próxima. O cálculo acontece no seu celular e não enviamos o GPS para o servidor.</p>
        <div className="locate-unit-actions">
          <button
            className="locate-unit-button"
            type="button"
            onClick={() => requestLocation(locate.status === "ready")}
            disabled={locate.status === "loading"}
          >
            {locate.status === "loading"
              ? "Localizando…"
              : locate.status === "ready"
                ? "Atualizar localização"
                : "Usar minha localização"}
          </button>
          {nearest ? (
            <a
              className="locate-unit-whatsapp"
              href={buildWhatsAppUrl(nearest.unit, resolveMessage(message, nearest.unit.shortName), {
                campaign: source,
                content: `${source}_${nearest.unit.id}_nearest`,
              })}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                rememberUnit(nearest.unit.id);
                trackEvent("whatsapp_click", {
                  unit: nearest.unit.id,
                  intent,
                  source,
                  placement: "nearest_unit",
                });
              }}
            >
              <WhatsAppIcon /> Pedir na mais próxima
            </a>
          ) : null}
        </div>
        <p className="locate-unit-status">
          {locate.status === "denied"
            ? "Permissão de localização negada. Escolha a loja pelo bairro."
            : locate.status === "unavailable"
              ? "Não foi possível obter a localização. Escolha a unidade manualmente."
              : nearest && isFarFromCoverage(nearest.distanceKm)
                ? `Você parece estar longe de Sabará. A unidade mais próxima no mapa é ${nearest.unit.shortName}. Confirme o bairro no WhatsApp.`
                : nearest
                  ? `Unidade mais próxima: ${nearest.unit.shortName} · ${formatDistance(nearest.distanceKm)}${locate.status === "ready" && locate.fromCache ? " (salvo neste aparelho)" : ""}`
                  : preferredId
                    ? "Sua última loja já aparece primeiro. Toque em localização se quiser a mais próxima agora."
                    : "Nada é enviado automaticamente. Só pedimos GPS quando você toca no botão."}
        </p>
      </div>

      <div className="direct-unit-links-grid">
        {units.map((unit: Unit) => {
          const km = distances[unit.id];
          const isNearest = nearest?.unit.id === unit.id;
          const isPreferred = preferredId === unit.id;

          return (
            <article key={unit.id} className={`direct-unit-link${isNearest ? " is-nearest" : ""}${isPreferred && !isNearest ? " is-preferred" : ""}`}>
              <span className="direct-unit-name">{unit.shortName}</span>
              <span className="direct-unit-neighborhood">{unit.shortAddress}</span>
              {typeof km === "number" ? <span className="direct-unit-distance">{formatDistance(km)}</span> : null}
              {isNearest ? <span className="nearest-unit-badge">Mais próxima</span> : null}
              {isPreferred && !isNearest ? <span className="preferred-unit-badge">Sua loja</span> : null}
              <UnitStatusBadge unit={unit} />
              <div className="direct-unit-actions">
                <a
                  href={buildWhatsAppUrl(unit, resolveMessage(message, unit.shortName), {
                    campaign: source,
                    content: `${source}_${unit.id}_pedido`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    rememberUnit(unit.id);
                    if (intent === "delivery_inquiry") {
                      trackEvent("delivery_inquiry", { unit: unit.id, source, placement: "direct_links" });
                    }
                    trackEvent("unit_selection", { unit: unit.id, intent, source, placement: "direct_links" });
                    trackEvent("whatsapp_click", { unit: unit.id, intent, source, placement: "direct_links" });
                  }}
                >
                  <WhatsAppIcon /> Pedir
                </a>
                <a
                  className="direct-unit-recipe"
                  href={buildWhatsAppUrl(unit, resolveMessage(recipeMessage, unit.shortName), {
                    campaign: source,
                    content: `${source}_${unit.id}_receita`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    rememberUnit(unit.id);
                    trackEvent("unit_selection", { unit: unit.id, intent: "enviar_receita", source, placement: "direct_links" });
                    trackEvent("whatsapp_click", { unit: unit.id, intent: "enviar_receita", source, placement: "direct_links_recipe" });
                  }}
                >
                  Receita
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
