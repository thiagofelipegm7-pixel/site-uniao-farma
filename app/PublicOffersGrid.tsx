"use client";

import { trackEvent } from "./analytics";
import WebImage from "./WebImage";
import "./encarte.css";
import "./photos-fix.css";
import { formatOfferPrice, getPublicOffers, OFFER_CATEGORY_LABELS, type Offer } from "./offers";

function OfferConsultCard({ offer }: { offer: Offer }) {
  return (
    <article className="offer-consult-card">
      <div className="offer-consult-image">
        {offer.image ? (
          <WebImage src={offer.image} alt={offer.name} width={480} height={480} sizes="(max-width: 720px) 80vw, 280px" />
        ) : (
          <span>{offer.placeholderLabel ?? "Oferta"}</span>
        )}
      </div>
      <div className="offer-consult-body">
        <p className="offer-consult-brand">
          {offer.brand || OFFER_CATEGORY_LABELS[offer.category]}
        </p>
        <h3>{offer.name}</h3>
        {offer.currentPrice !== null ? (
          <p className="offer-consult-price">
            <strong>{formatOfferPrice(offer.currentPrice)}</strong>
            {offer.previousPrice ? <s>{formatOfferPrice(offer.previousPrice)}</s> : null}
          </p>
        ) : null}
        <a
          className="offer-consult-choose"
          href="#ofertas-whatsapp"
          aria-label={`Escolher loja para consultar ${offer.name}`}
          onClick={() => {
            try {
              sessionStorage.setItem("uf_selected_offer", offer.id);
            } catch {
              /* ignore */
            }
            trackEvent("offer_choose_store", {
              offer_id: offer.id,
              source: "encarte_grid",
            });
          }}
        >
          Escolher loja
        </a>
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
