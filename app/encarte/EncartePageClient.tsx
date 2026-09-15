"use client";

import { useEffect, useState } from "react";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import DirectUnitLinks from "../DirectUnitLinks";
import PublicOffersGrid from "../PublicOffersGrid";
import { INSTAGRAM_URL, UNITS, buildWhatsAppUrl } from "../site-config";
import { formatOfferPrice, getOfferById, getOffersLastUpdatedDate, type Offer } from "../offers";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";
import "../offers-polish.css";
import "../encarte.css";
import "../page-concordance.css";

export default function EncartePageClient() {
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
    ? `Oi, União Farma {unidade}! Vi no encarte do site a oferta de ${selectedOffer.name}${selectedOffer.currentPrice !== null ? ` por ${formatOfferPrice(selectedOffer.currentPrice)}` : ""}. Tem disponível hoje?`
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

      <div className="encarte-page">
        <section className="section-inner">
          <p className="eyebrow">Encarte da semana</p>
          <h1>Ofertas no Instagram e no site, no mesmo dia</h1>
          <p>Quem vê o post cai na loja certa. Sem telefone único.</p>
          <div className="encarte-unit-row">
            {UNITS.map((unit) => (
              <a
                key={unit.id}
                className="button button-whatsapp"
                href={buildWhatsAppUrl(unit, WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName), {
                  campaign: "instagram_encarte",
                  content: unit.id,
                })}
                target="_blank"
                rel="noreferrer"
              >
                Pedir em {unit.id === "fatima" ? "Fátima" : unit.id === "nacoes" ? "Nações" : "Itacolomi"}
              </a>
            ))}
          </div>
          <p>
            <a className="button button-call" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              Ver no Instagram
            </a>
          </p>
          {freshnessDate ? (
            <p className="offers-freshness" style={{ marginTop: 12 }}>
              Encarte conferido em {freshnessDate}. Vale enquanto durar o estoque em cada loja.
            </p>
          ) : null}
        </section>

        <section className="section-inner" style={{ marginTop: 24 }}>
          <p className="section-kicker">Promoções ativas</p>
          <h2 style={{ margin: "0 0 16px", color: "#142924", fontSize: "1.4rem" }}>Produtos do encarte</h2>
          <PublicOffersGrid
            selectedOfferId={selectedOfferId}
            onSelectOffer={handleSelectOffer}
            actionSource="encarte_page"
          />
        </section>

        <section
          className={`section offers-whatsapp-section${selectedOffer ? " has-selected-offer" : ""}`}
          id="ofertas-whatsapp"
          aria-labelledby="encarte-whatsapp-title"
          style={{ marginTop: 36 }}
        >
          <div className="section-inner">
            <p className="section-kicker">WhatsApp direto</p>
            <h2 id="encarte-whatsapp-title">
              {selectedOffer ? `Pedir ${selectedOffer.name} no WhatsApp` : "Escolha a unidade para pedir"}
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
              source="encarte_page"
            />
          </div>
        </section>
      </div>

      <ContentSiteFooter />
    </>
  );
}
