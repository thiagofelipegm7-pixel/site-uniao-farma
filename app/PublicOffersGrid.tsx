"use client";

import { trackEvent } from "./analytics";
import "./encarte.css";
import { recordMetric } from "./metrics";
import { formatOfferPrice, getPublicOffers, type Offer } from "./offers";
import { buildWhatsAppUrl, UNITS } from "./site-config";

const UNIT_SHORT: Record<string, string> = {
  fatima: "Fátima",
  nacoes: "Nações",
  itacolomi: "Itacolomi",
};

function offerMessage(unitName: string, offer: Offer): string {
  const price =
    offer.currentPrice !== null ? ` por ${formatOfferPrice(offer.currentPrice)}` : "";
  return `Oi, União Farma ${unitName}! Vi a oferta de ${offer.name}${price} no encarte. Tem hoje?`;
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
        <span className="offer-consult-stamp">Consulte</span>
      </div>
      <div className="offer-consult-body">
        <h3>{offer.name}</h3>
        {offer.brand ? <p className="offer-consult-brand">{offer.brand}</p> : null}
        {offer.currentPrice !== null ? (
          <p className="offer-consult-price">
            <strong>{formatOfferPrice(offer.currentPrice)}</strong>
            {offer.previousPrice ? <s>{formatOfferPrice(offer.previousPrice)}</s> : null}
          </p>
        ) : null}
        <p className="offer-consult-note">
          {offer.validityType === "while_stock_lasts"
            ? "Preço sujeito a estoque. Confirme na loja."
            : "Consulte disponibilidade na loja."}
        </p>
        <div className="offer-consult-units" aria-label={`Consultar ${offer.name} por unidade`}>
          {units.map((unit) => (
            <a
              key={unit.id}
              href={buildWhatsAppUrl(unit, offerMessage(unit.shortName, offer), {
                campaign: "encarte",
                content: `offer_${offer.id}_${unit.id}`,
              })}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                recordMetric({ unit: unit.id, intent: "offer", source: "encarte_grid" });
                trackEvent("offer_unit_select", {
                  offer_id: offer.id,
                  unit: unit.id,
                  source: "encarte_grid",
                });
                trackEvent("whatsapp_click", {
                  offer_id: offer.id,
                  unit: unit.id,
                  source: "encarte_grid",
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
