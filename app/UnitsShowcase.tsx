"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "./analytics";
import { trackWhatsAppClick } from "./metrics";
import { readPreferredUnitId, sortUnitsByPreference, writePreferredUnitId } from "./preferred-unit";
import { buildWhatsAppUrl, UNITS, type Unit } from "./site-config";
import { UNIT_PHOTOS, UNIT_PHOTO_KIND } from "./unit-photos";
import UnitStatusBadge from "./UnitStatusBadge";
import WebImage from "./WebImage";
import { WHATSAPP_MESSAGES } from "./whatsapp-messages";

const PAGE_HREF: Record<Unit["id"], string> = {
  fatima: "/fatima",
  nacoes: "/nacoes-unidas",
  itacolomi: "/itacolomi",
};

const SHORT_LABEL: Record<Unit["id"], string> = {
  fatima: "Fátima",
  nacoes: "Nações Unidas",
  itacolomi: "Itacolomi",
};

function splitAddress(value: string): { street: string; place: string } {
  const [street, place] = value.split(" · ");
  return {
    street: street?.trim() || value,
    place: place?.trim() || "",
  };
}

export default function UnitsShowcase() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [preferredId, setPreferredId] = useState<Unit["id"] | null>(null);
  const units = useMemo(() => sortUnitsByPreference(UNITS, preferredId), [preferredId]);

  useEffect(() => {
    const saved = readPreferredUnitId();
    if (saved) setPreferredId(saved);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Unit["id"]>).detail;
      if (detail) setPreferredId(detail);
    };
    window.addEventListener("uf-preferred-unit", onChange);
    return () => window.removeEventListener("uf-preferred-unit", onChange);
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !preferredId) return;
    const card = grid.querySelector<HTMLElement>(`.unit-store-card-${preferredId}`);
    card?.scrollIntoView({ inline: "start", block: "nearest", behavior: "instant" });
  }, [preferredId, units]);

  return (
    <section className="units-showcase" id="unidades-rapidas" aria-labelledby="units-showcase-title">
      <div className="units-showcase-inner">
        <header className="units-showcase-head">
          <p className="section-kicker">{"Três lojas em Sabará"}</p>
          <h2 id="units-showcase-title">Escolha a unidade do seu bairro</h2>
        </header>

        <div className="units-showcase-grid" role="list" ref={gridRef}>
          {units.map((unit, index) => {
            const label = SHORT_LABEL[unit.id];
            const kind = UNIT_PHOTO_KIND[unit.id];
            const { street, place } = splitAddress(unit.shortAddress);
            const message = WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName);
            const waHref = buildWhatsAppUrl(unit, message, {
              campaign: "home_units",
              content: `home_units_${unit.id}`,
            });

            return (
              <article className={`unit-store-card unit-store-card-${unit.id}`} key={unit.id} role="listitem">
                <a
                  className="unit-store-photo-link"
                  href={PAGE_HREF[unit.id]}
                  aria-label={`Ver página da loja ${label}`}
                  onClick={() => writePreferredUnitId(unit.id)}
                >
                  <WebImage
                    className="unit-store-photo"
                    src={UNIT_PHOTOS[unit.id]}
                    alt={`${kind} da União Farma ${label} — ${unit.shortAddress}`}
                    width={640}
                    height={416}
                    priority={index === 0}
                    sizes="(max-width: 720px) 88vw, 360px"
                  />
                  <span className="unit-store-photo-tag">
                    <strong>{kind}</strong>
                    <span>{label}</span>
                  </span>
                </a>
                <div className="unit-store-body">
                  <p className="unit-store-hood">{unit.neighborhood}</p>
                  <h3>{label}</h3>
                  <p className="unit-store-addr">
                    <span className="unit-store-street">{street}</span>
                    {place ? <span className="unit-store-place">{place}</span> : null}
                  </p>
                  <UnitStatusBadge unit={unit} />
                  <div className="unit-store-actions">
                    <a
                      className="unit-store-wa"
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Falar no WhatsApp com a loja ${label}`}
                      onClick={() => {
                        writePreferredUnitId(unit.id);
                        trackWhatsAppClick({
                          unit: unit.id,
                          intent: "product",
                          source: "home_units",
                          placement: "unit_card",
                        });
                        trackEvent("unit_selection", {
                          unit: unit.id,
                          intent: "product",
                          source: "home_units",
                        });
                      }}
                    >
                      Falar com esta loja
                    </a>
                    <a
                      className="unit-store-map"
                      href={unit.map}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Como chegar à loja ${label}`}
                      onClick={() => writePreferredUnitId(unit.id)}
                    >
                      Como chegar
                    </a>
                  </div>
                  <a
                    className="unit-store-more"
                    href={PAGE_HREF[unit.id]}
                    aria-label={`Abrir página da unidade ${label}`}
                    onClick={() => writePreferredUnitId(unit.id)}
                  >
                    {"Ver página da unidade"}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
