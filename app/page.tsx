"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep the Novidades route working in Vinext production. */

import { useEffect, useRef, useState } from "react";
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import { SITE_OPTIONS, SITE_URL } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import { getPageStructuredData } from "./structured-data";
import { formatOfferPrice, getPublicOffers } from "./offers";
import { WhatsAppIcon, UnitSelectorModal, type SelectorIntent } from "./home-chrome";
import { HomeSections } from "./home-sections";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectorIntent, setSelectorIntent] = useState<SelectorIntent | null>(null);
  const consultationRef = useRef<HTMLDivElement | null>(null);
  const heroOffers = getPublicOffers().slice(0, 3);
  const homeStructuredData = getPageStructuredData({
    name: "Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    faqs: HOME_FAQS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

  const openSelector = (intent: SelectorIntent) => {
    trackEvent("unit_selector_open", { intent: intent.eventName });
    setSelectorIntent(intent);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 860) setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [menuOpen]);

  const generalIntent: SelectorIntent = {
    title: "Escolha sua unidade",
    description: "Selecione a loja em que deseja consultar preço, estoque ou fazer seu pedido.",
    message: "Olá, União Farma {unidade}! Quero pedir um produto. Nome: ___  dosagem: ___  bairro: ___",
    eventName: "consulta_geral",
  };

  const featuredOfferIntent: SelectorIntent = {
    title: "Consultar oferta",
    description: "Escolha a unidade para confirmar a disponibilidade do Creme Seda.",
    message: "Oi, União Farma {unidade}! Vi a oferta do Creme Seda 300 ml a R$ 13,90. Tem hoje?",
    eventName: "oferta_creme_seda",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }} />
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className={SITE_OPTIONS.promoToast.enabled ? "site-header has-promo" : "site-header"}>
        <nav className="nav" aria-label="Menu principal">
          <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
            <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="52" height="52" fetchPriority="high" decoding="async" />
            <span>
              <strong>União Farma</strong>
              <small>Drogaria e Perfumaria</small>
            </span>
          </a>
          <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="menu-links" aria-label={menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"} onClick={() => setMenuOpen((value) => !value)}>
            <span className="menu-label">{menuOpen ? "Fechar" : "Menu"}</span>
          </button>
          <div className={menuOpen ? "menu-links is-open" : "menu-links"} id="menu-links">
            <a href="/ofertas" onClick={() => setMenuOpen(false)}>Ofertas</a>
            <a href="#unidades-rapidas" onClick={() => setMenuOpen(false)}>Unidades</a>
            <a href="/receita" onClick={() => setMenuOpen(false)}>Receita</a>
          </div>
          <button className="header-cta" type="button" onClick={() => openSelector(generalIntent)}>
            <WhatsAppIcon /> Pedir no WhatsApp
          </button>
        </nav>
      </header>
      <main id="conteudo">
        <section className="hero reveal is-visible" id="inicio" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Drogaria e Perfumaria em Sabará</p>
              <h1 id="hero-title">Cuidado, ofertas e entrega pertinho de você.</h1>
              <p className="hero-lead">Consulte produtos, preço e disponibilidade pelo WhatsApp da unidade mais próxima.</p>
              <div className="hero-actions" ref={consultationRef}>
                <DirectUnitLinks message={generalIntent.message} intent={generalIntent.eventName} source="home_hero" heading="Escolha sua unidade e fale direto com a equipe" description="Rua, horário e atendimento direto em cada loja." />
              </div>
            </div>
            <aside className="hero-offer-showcase" aria-label="Ofertas em destaque">
              <div className="hero-product-stack">
                {heroOffers.map((offer, index) => (
                  <article className={`hero-product hero-product-${index + 1}`} key={offer.id}>
                    {offer.image && (
                      <img src={offer.image} alt={offer.name} width="360" height="360" fetchPriority={index === 0 ? "high" : "low"} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
                    )}
                    {index === 0 && offer.currentPrice !== null && (
                      <span className="hero-price-tag"><small>A partir de</small><strong>{formatOfferPrice(offer.currentPrice)}</strong></span>
                    )}
                  </article>
                ))}
              </div>
              <button className="button button-whatsapp hero-offer-cta" type="button" onClick={() => openSelector(featuredOfferIntent)}>Pedir esta oferta</button>
            </aside>
          </div>
        </section>
        <HomeSections generalIntent={generalIntent} openSelector={openSelector} />
      </main>
      <UnitSelectorModal intent={selectorIntent} onClose={() => setSelectorIntent(null)} />
    </>
  );
}
