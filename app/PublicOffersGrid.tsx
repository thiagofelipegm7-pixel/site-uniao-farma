"use client";

import { trackEvent } from "./analytics";
import WebImage from "./WebImage";
import { responsiveSrcSet } from "./responsive-images";
import "./encarte.css";
import "./photos-fix.css";
import { formatOfferPrice, getPublicOffers, OFFER_CATEGORY_LABELS, type Offer } from "./offers";

export type PublicOffersGridProps = {
  selectedOfferId?: string | null;
  onSelectOffer?: (offer: Offer) => void;
  actionSource?: string;
};

function OfferConsultCard({
  offer,
  isSelected,
  onSelect,
  actionSource = "encarte_grid",
  priority = false,
}: {
  offer: Offer;
  isSelected?: boolean;
  onSelect?: (offer: Offer) => void;
  actionSource?: string;
  priority?: boolean;
}) {
  const price = offer.currentPrice !== null ? formatOfferPrice(offer.currentPrice) : "preço sob consulta";
  const alt = `${offer.name} em oferta na União Farma. ${price}, enquanto durar o estoque.`;

  const handleClick = () => {
    try {
      sessionStorage.setItem("uf_selected_offer", offer.id);
    } catch {
      /* ignore */
    }
    trackEvent("offer_choose_store", {
      offer_id: offer.id,
      source: actionSource,
    });
    if (onSelect) {
      onSelect(offer);
    }
  };

  return (
    <article className={`offer-consult-card${isSelected ? " is-selected" : ""}`}>
      <div className="offer-consult-image">
        {offer.image ? (
          <WebImage
            src={offer.image}
            alt={alt}
            width={480}
            height={480}
            sizes="(max-width: 720px) 80vw, 280px"
            priority={priority}
            srcSet={responsiveSrcSet(offer.image, [480, 768])}
          />
        ) : (
          <span>{offer.placeholderLabel ?? "Oferta"}</span>
        )}
        {isSelected ? <span className="offer-consult-selected-tag">Selecionado</span> : null}
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
          className={`offer-consult-choose${isSelected ? " is-active" : ""}`}
          href="#ofertas-whatsapp"
          aria-label={isSelected ? `${offer.name} selecionado. Escolha a loja abaixo` : `Escolher loja para pedir ${offer.name} por ${price}`}
          onClick={handleClick}
        >
          {isSelected ? "Loja selecionada abaixo ↓" : "Pedir no WhatsApp"}
        </a>
      </div>
    </article>
  );
}

export default function PublicOffersGrid({
  selectedOfferId,
  onSelectOffer,
  actionSource = "encarte_grid",
}: PublicOffersGridProps = {}) {
  const offers = getPublicOffers();

  if (offers.length === 0) {
    return (
      <p className="offers-empty-note">As ofertas da semana entram no ar depois da confirmação com as lojas.</p>
    );
  }

  return (
    <div className="offer-consult-grid" aria-label="Ofertas em destaque">
      {offers.map((offer, index) => (
        <OfferConsultCard
          key={offer.id}
          offer={offer}
          isSelected={selectedOfferId === offer.id}
          onSelect={onSelectOffer}
          actionSource={actionSource}
          priority={index === 0}
        />
      ))}
    </div>
  );
}


