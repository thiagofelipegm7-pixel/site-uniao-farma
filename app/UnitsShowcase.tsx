"use client";

import { trackEvent } from "./analytics";
import { trackWhatsAppClick } from "./metrics";
import { buildWhatsAppUrl, UNITS, type Unit } from "./site-config";
import { UNIT_PHOTOS, UNIT_PHOTO_KIND } from "./unit-photos";
import UnitStatusBadge, { getFallbackLabel } from "./UnitStatusBadge";
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
  return (
    <section className="units-showcase" id="unidades-rapidas" aria-labelledby="units-showcase-title">
      <div className="units-showcase-inner">
        <header className="units-showcase-head">
          <p className="section-kicker">{"Três lojas em Sabará"}</p>
          <h2 id="units-showcase-title">Escolha a unidade do seu bairro</h2>
        </header>

        <div className="units-showcase-grid" role="list">
          {UNITS.map((unit) => {
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
                <a className="unit-store-photo-link" href={PAGE_HREF[unit.id]} aria-label={`Ver página da loja ${label}`}
                >
                  <img
                    className="unit-store-photo"
                    src={UNIT_PHOTOS[unit.id]}
                    alt={`${kind} da União Farma ${label} — ${unit.shortAddress}`}
                    width="800"
                    height="520"
                    loading="lazy"
                    decoding="async"
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
                  <p className="unit-store-hours">{getFallbackLabel(unit)}</p>
                  <div className="unit-store-actions">
                    <a
                      className="unit-store-wa"
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Falar no WhatsApp com a loja ${label}`}
                      onClick={() => {
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
                    >
                      Como chegar
                    </a>
                  </div>
                  <a className="unit-store-more" href={PAGE_HREF[unit.id]} aria-label={`Abrir página da unidade ${label}`}>
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
