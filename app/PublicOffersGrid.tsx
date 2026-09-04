"use client";

import { trackEvent } from "./analytics";
import "./encarte.css";
import { recordMetric } from "./metrics";
import { formatOfferPrice, getPublicOffers, OFFER_CATEGORY_LABELS, type Offer } from "./offers";
import { buildWhatsAppUrl, UNITS } from "./site-config";
import { stockLabel, type StockRow } from "./stock";
import { useStock } from "./useStock";

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

function unitStatus(rows: StockRow[], offerId: string, unitId: string) {
  return rows.find((row) => row.offerId === offerId && row.unit === unitId)?.status || "consult";
}

function OfferConsultCard({ offer, rows }: { offer: Offer; rows: StockRow[] }) {
  const units = UNITS.filter((unit) => offer.units.includes(unit.id));

  return (
    <article className="offer-consult-card">
      <div className="offer-consult-image">
        {offer.image ? (
          <img src={offer.image} alt={offer.name} width="640" height="640" loading="lazy" />
        ) : (
          <span>{offer.placeholderLabel ?? "Oferta"}</span>
        )}
        <span className="offer-consult-stamp">Consulte</span>
        <span className="offer-consult-cat">{OFFER_CATEGORY_LABELS[offer.category]}</span>
      </div>
      <div className="offer-consult-body">
        {offer.brand ? <p className="offer-consult-brand">{offer.brand}</p> : null}
        <h3>{offer.name}</h3>
        {offer.currentPrice !== null ? (
          <p className="offer-consult-price">
            <strong>{formatOfferPrice(offer.currentPrice)}</strong>
            {offer.previousPrice ? <s>{formatOfferPrice(offer.previousPrice)}</s> : null}
          </p>
        ) : null}
        <div className="offer-consult-units" aria-label={`Consultar ${offer.name} por unidade`}>
          {units.map((unit) => {
            const status = unitStatus(rows, offer.id, unit.id);
            return (
              <a
                key={unit.id}
                href={buildWhatsAppUrl(unit, offerMessage(unit.shortName, offer), {
                  campaign: "encarte",
                  content: `offer_${offer.id}_${unit.id}`,
                })}
                target="_blank"
                rel="noreferrer"
                data-stock={status}
                onClick={() => {
                  recordMetric({ unit: unit.id, intent: "offer", source: "encarte_grid" });
                  trackEvent("offer_unit_select", {
                    offer_id: offer.id,
                    unit: unit.id,
                    stock: status,
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
                <small>{stockLabel(status)}</small>
              </a>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function PublicOffersGrid() {
  const offers = getPublicOffers();
  const { live } = useStock();
  const { rows } = useStock();

  if (offers.length === 0) {
    return (
      <p className="offers-empty-note">As ofertas da semana entram no ar depois da confirmação com as lojas.</p>
    );
  }

  return (
    <>
      <p className="offer-consult-note">{live ? "Estoque ao vivo por loja." : "Preço de encarte. Confirme na loja."}</p>
      <div className="offer-consult-grid">
        {offers.map((offer) => (
          <OfferConsultCard key={offer.id} offer={offer} rows={rows} />
        ))}
      </div>
    </>
  );
}
