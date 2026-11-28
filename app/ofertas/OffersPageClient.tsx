"use client";
import OffersGroupCta from "../OffersGroupCta";

import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import DirectUnitLinks from "../DirectUnitLinks";
import OfferAlerts from "../OfferAlerts";
import PublicOffersGrid from "../PublicOffersGrid";
import NotasGoogle from "../shop/NotasGoogle";
import { WHATSAPP_SLA } from "../site-config";
import { formatOfferDate, getOffersKicker, getOffersReviewDate, getPublicOffers } from "../offers";
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
  const reviewDate = getOffersReviewDate();
  const validade = getPublicOffers()
    .map((offer) => offer.validUntil)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />

      <div className="offers-page">
        <section className="hero hero-home offers-hero" aria-labelledby="offers-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">{getOffersKicker()}</p>
              <h1 id="offers-title">Ofertas da semana em Sabará</h1>
              <p className="hero-lead">
                Economize nas compras do dia a dia porque você confere o encarte aqui e a equipe confirma o estoque no
                WhatsApp {WHATSAPP_SLA} — sem fila e sem pagar antes.
              </p>
              <p className="offers-freshness">
                {reviewDate ? `Encarte conferido em ${formatOfferDate(reviewDate)}. ` : ""}
                {validade
                  ? `Ofertas válidas até ${formatOfferDate(validade)}, enquanto durar o estoque em cada loja.`
                  : "Vale enquanto durar o estoque em cada loja."}
              </p>
            </div>
          </div>
        </section>

        <section className="section offers-list-section" id="lista-ofertas" aria-labelledby="offers-list-title">
          <div className="section-inner">
            <p className="section-kicker">Promoções</p>
            <h2 id="offers-list-title">Em destaque</h2>
            <PublicOffersGrid />
          </div>
        </section>

        <section className="section offers-whatsapp-section" id="ofertas-whatsapp" aria-labelledby="ofertas-whatsapp-title">
          <div className="section-inner">
            <p className="section-kicker">WhatsApp da loja</p>
            <h2 id="ofertas-whatsapp-title">Escolha a unidade</h2>
            <DirectUnitLinks
              compact
              message={WHATSAPP_MESSAGES.offer}
              intent="offer"
              source="ofertas_page"
            />
            <NotasGoogle className="notas-google--ofertas" />
          </div>
        </section>

        <section className="section offers-group-band" aria-labelledby="offers-group-band-title">
          <div className="section-inner">
            <h2 id="offers-group-band-title">Receba as próximas ofertas</h2>
            <p>Promoções da semana de higiene, perfumaria e cuidado diário da loja Nações Unidas no seu celular — grátis e você sai quando quiser.</p>
            <p>
              <OffersGroupCta placement="ofertas_top" />
            </p>
            <OfferAlerts showButton />
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
