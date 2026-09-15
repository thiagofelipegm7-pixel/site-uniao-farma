"use client";

import { useEffect, useState } from "react";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import DirectUnitLinks from "../DirectUnitLinks";
import OfferAlerts from "../OfferAlerts";
import PublicOffersGrid from "../PublicOffersGrid";
import { formatOfferPrice, getOfferById, getOffersLastUpdatedDate, type Offer } from "../offers";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";
import "../offers-polish.css";
import "../offer-alerts.css";

type FAQ = { q: string; a: string };

export default function OffersPageClient({
  faqs,
}: {
  faqs: FAQ[];
  showReviewPanel: boolean;
}) {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const freshnessDate = getOffersLastUpdatedDate();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("uf_selected_offer");
      if (stored) {
        // The selected offer lives in session storage and is intentionally hydrated after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedOfferId(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const selectedOffer = selectedOfferId ? getOfferById(selectedOfferId) : null;

  const whatsappMessage = selectedOffer
    ? `Oi, União Farma {unidade}! Vi no site a oferta de ${selectedOffer.name}${selectedOffer.currentPrice !== null ? ` por ${formatOfferPrice(selectedOffer.currentPrice)}` : ""}. Tem disponível hoje?`
    : WHATSAPP_MESSAGES.offer;

  const handleSelectOffer = (offer: Offer) => {
    setSelectedOfferId(offer.id);
    const target = document.getElementById("ofertas-whatsapp");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleClearOffer = () => {
    setSelectedOfferId(null);
    try {
      sessionStorage.removeItem("uf_selected_offer");
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />

      <div className="offers-page">
        <section className="hero hero-home offers-hero" aria-labelledby="offers-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Ofertas da semana</p>
              <h1 id="offers-title">Ofertas em Sabará</h1>
              <p className="hero-lead">
                Escolha o produto e depois a loja. A equipe confirma se tem hoje.
              </p>
              <p className="offers-freshness">
                {freshnessDate
                  ? `Encarte conferido em ${freshnessDate}. Vale enquanto durar o estoque em cada loja.`
                  : "Ofertas válidas enquanto durar o estoque em cada loja."}
              </p>
              <OfferAlerts showButton />
            </div>
          </div>
        </section>

        <section className="section offers-list-section" id="lista-ofertas" aria-labelledby="offers-list-title">
          <div className="section-inner">
            <p className="section-kicker">Promoções</p>
            <h2 id="offers-list-title">Em destaque</h2>
            <PublicOffersGrid
              selectedOfferId={selectedOfferId}
              onSelectOffer={handleSelectOffer}
              actionSource="ofertas_page"
            />
          </div>
        </section>

        <section
          className={`section offers-whatsapp-section${selectedOffer ? " has-selected-offer" : ""}`}
          id="ofertas-whatsapp"
          aria-labelledby="ofertas-whatsapp-title"
        >
          <div className="section-inner">
            <p className="section-kicker">WhatsApp da loja</p>
            <h2 id="ofertas-whatsapp-title">
              {selectedOffer ? `Pedir ${selectedOffer.name} no WhatsApp` : "Escolha a unidade"}
            </h2>
            {selectedOffer ? (
              <div className="selected-offer-banner" role="status" aria-live="polite">
                <div className="selected-offer-info">
                  <span className="selected-offer-tag">Produto escolhido</span>
                  <strong className="selected-offer-title">{selectedOffer.name}</strong>
                  {selectedOffer.currentPrice !== null ? (
                    <span className="selected-offer-price">{formatOfferPrice(selectedOffer.currentPrice)}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="selected-offer-clear"
                  onClick={handleClearOffer}
                  aria-label="Trocar ou desmarcar produto selecionado"
                >
                  Trocar produto
                </button>
              </div>
            ) : null}
            <DirectUnitLinks
              compact
              message={whatsappMessage}
              intent="offer"
              source="ofertas_page"
            />
          </div>
        </section>

        <section className="section offers-faq" aria-labelledby="offers-faq-title">
          <div className="section-inner offers-faq-inner">
            <h2 id="offers-faq-title">Antes de chamar</h2>
            <div>
              {faqs.map((faq) => (
                <details key={faq.q} className="offers-faq-item">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>

      <ContentSiteFooter />
    </>
  );
}

