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
  fatima: "F\u00e1tima",
  nacoes: "Na\u00e7\u00f5es Unidas",
  itacolomi: "Itacolomi",
};

export default function UnitsShowcase() {
  return (
    <section className="units-showcase" id="unidades-rapidas" aria-labelledby="units-showcase-title">
      <div className="units-showcase-inner">
        <header className="units-showcase-head">
          <p className="section-kicker">Tr\u00eas lojas em Sabar\u00e1</p>
          <h2 id="units-showcase-title">Escolha a unidade do seu bairro</h2>
          <p className="units-showcase-lead">
            Foto identificada, endere\u00e7o, hor\u00e1rio e rota. O WhatsApp abre na loja certa.
          </p>
        </header>

        <div className="units-showcase-grid">
          {UNITS.map((unit) => {
            const label = SHORT_LABEL[unit.id];
            const kind = UNIT_PHOTO_KIND[unit.id];
            const message = WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName);
            const waHref = buildWhatsAppUrl(unit, message, {
              campaign: "home_units",
              content: `home_units_${unit.id}`,
            });

            return (
              <article className="unit-store-card" key={unit.id}>
                <a className="unit-store-photo-link" href={PAGE_HREF[unit.id]}>
                  <img
                    className="unit-store-photo"
                    src={UNIT_PHOTOS[unit.id]}
                    alt={`${kind} da Uni\u00e3o Farma ${label} \u2014 ${unit.shortAddress}`}
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
                  <p className="unit-store-addr">{unit.shortAddress}</p>
                  <UnitStatusBadge unit={unit} />
                  <p className="unit-store-hours">{getFallbackLabel(unit)}</p>
                  <div className="unit-store-actions">
                    <a
                      className="unit-store-wa"
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
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
                    <a className="unit-store-map" href={unit.map} target="_blank" rel="noreferrer">
                      Como chegar
                    </a>
                  </div>
                  <a className="unit-store-more" href={PAGE_HREF[unit.id]}>
                    Ver p\u00e1gina da unidade
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
