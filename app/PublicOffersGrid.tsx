"use client";

import { trackEvent } from "./analytics";
import { recordMetric } from "./metrics";
import { getPublicOffers, type Offer } from "./offers";
import { buildWhatsAppUrl, UNITS } from "./site-config";

const UNIT_SHORT: Record<string, string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

function offerMessage(unitName: string, offer: Offer): string {
  return `Oi, União Farma ${unitName}! Vi a oferta de ${offer.name} no site. Tem hoje?`;
}

function OfferConsultCard({ offer }: { offer: Offer }) {
  const units = UNITS.filter((unit) => offer.units.includes(unit.id));

  return (
    <article className="offer-consult-card">
      <div className="offer-consult-image">
        {offer.image ? (
          <img src={offer.image} alt={offer.name} width="640" height="480" loading="lazy" />
        ) : (
          <span>{offer.placeholderLabel ?? "Oferta"}</span>
        )}
      </div>
      <div className="offer-consult-body">
        <h3>{offer.name}</h3>
        {offer.brand ? <p>{offer.brand}</p> : null}
        <p className="offer-consult-note">Consulte disponibilidade na loja.</p>
        <div className="offer-consult-units" aria-label={`Consultar ${offer.name} por unidade`}>
          {units.map((unit) => (
            <a
              key={unit.id}
              href={buildWhatsAppUrl(unit, offerMessage(unit.shortName, offer), {
                campaign: "ofertas",
                content: `offer_${offer.id}_${unit.id}`,
              })}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                recordMetric({ unit: unit.id, intent: "offer", source: "offers_grid" });
                trackEvent("offer_unit_select", {
                  offer_id: offer.id,
                  unit: unit.id,
                  source: "offers_grid",
                });
                trackEvent("whatsapp_click", {
                  offer_id: offer.id,
                  unit: unit.id,
                  source: "offers_grid",
                  placement: "offer_card_direct",
                });
              }}
            >
              {UNIT_SHORT[unit.id]}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function PublicOffersGrid() {
  const offers = getPublicOffers();

  if (offers.length === 0) {
    return (
      <p className="offers-empty-note">As ofertas da semana entram no ar depois da confirmação com as lojas.</p>
    );
  }

  return (
    <div className="offer-consult-grid">
      {offers.map((offer) => (
        <OfferConsultCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}
