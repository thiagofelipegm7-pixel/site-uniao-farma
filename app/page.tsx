"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep the Novidades route working in Vinext production. */

import { useEffect, useState } from "react";
import { trackEvent } from "./analytics";
import { buildWhatsAppUrl, SITE_OPTIONS, SITE_URL, UNITS } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import { getPageStructuredData } from "./structured-data";
import { WhatsAppIcon, UnitSelectorModal, type SelectorIntent } from "./home-chrome";
import { HomeSections } from "./home-sections";
import { STORE_PHOTOS } from "./store-photos";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectorIntent, setSelectorIntent] = useState<SelectorIntent | null>(null);
  const homeStructuredData = getPageStructuredData({
    name: "Farm\u00e1cia em Sabar\u00e1 | Uni\u00e3o Farma",
    url: `${SITE_URL}/`,
    faqs: HOME_FAQS,
    breadcrumbs: [{ name: "In\u00edcio", url: `${SITE_URL}/` }],
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
    title: "Qual loja fica melhor para voc\u00ea?",
    description: "F\u00e1tima, Na\u00e7\u00f5es ou Itacolomi. A conversa abre no WhatsApp da unidade certa.",
    message: "Oi, Uni\u00e3o Farma {unidade}! Quero consultar um produto. Posso mandar o nome?",
    eventName: "consulta_geral",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }} />
      <header className={SITE_OPTIONS.promoToast.enabled ? "site-header has-promo" : "site-header"}>
        <nav className="nav" aria-label="Menu principal">
          <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
            <img src="/icon-192.png" alt="Logo da Uni\u00e3o Farma" width="52" height="52" decoding="async" />
            <span>
              <strong>Uni\u00e3o Farma</strong>
              <small>Drogaria e Perfumaria</small>
            </span>
          </a>
          <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="menu-links" aria-label={menuOpen ? "Fechar menu de navega\u00e7\u00e3o" : "Abrir menu de navega\u00e7\u00e3o"} onClick={() => setMenuOpen((value) => !value)}>
            <span className="menu-label">{menuOpen ? "Fechar" : "Menu"}</span>
          </button>
          <div className={menuOpen ? "menu-links is-open" : "menu-links"} id="menu-links">
            <a href="/ofertas" onClick={() => setMenuOpen(false)}>Ofertas</a>
            <a href="#unidades-rapidas" onClick={() => setMenuOpen(false)}>Unidades</a>
            <a href="/receita" onClick={() => setMenuOpen(false)}>Receita</a>
          </div>
          <a className="header-cta" href="#whatsapp-lojas" onClick={() => setMenuOpen(false)}>
            <WhatsAppIcon /> WhatsApp
          </a>
        </nav>
      </header>
      <section className="hero reveal is-visible" id="inicio" aria-labelledby="hero-title">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Tr\u00eas farm\u00e1cias em Sabar\u00e1</p>
            <h1 id="hero-title">Cuidado, ofertas e entrega pertinho de voc\u00ea.</h1>
            <p className="hero-lead">Toque na loja do seu bairro. O WhatsApp abre na hora, com a conversa pronta.</p>
          </div>
          <aside className="hero-offer-showcase hero-illustration" aria-label="Atendimento na Uni\u00e3o Farma">
            <img
              className="hero-illustration-img"
              src="/illustrations/atendimento.svg?v=8"
              alt="Ilustra\u00e7\u00e3o de farmac\u00eautica orientando uma cliente no balc\u00e3o da Uni\u00e3o Farma"
              width="720"
              height="540"
              sizes="(max-width: 860px) 92vw, 380px"
              fetchPriority="high"
              decoding="async"
            />
          </aside>
          <div className="hero-whatsapp" id="whatsapp-lojas">
            <p className="hero-whatsapp-label">Falar com a loja agora</p>
            <div className="hero-whatsapp-row">
              {UNITS.map((unit) => (
                <a
                  key={unit.id}
                  className="hero-whatsapp-btn"
                  href={buildWhatsAppUrl(unit, generalIntent.message.replaceAll("{unidade}", unit.shortName), {
                    campaign: "home_hero",
                    content: `home_hero_${unit.id}`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("whatsapp_click", { unit: unit.id, source: "home_hero", placement: "hero_direct" })}
                >
                  <WhatsAppIcon />
                  <span>{unit.shortName}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="store-photos hero-store-photos" role="list" aria-label="Fotos reais da loja, identificadas por unidade">
            {STORE_PHOTOS.map((photo, index) => (
              <figure className="store-photo" key={photo.src} role="listitem">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width="800"
                  height="600"
                  sizes="84vw"
                  decoding="async"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <figcaption>
                  <strong>{photo.kind}</strong>
                  <span>{photo.unit}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="store-photos-hint">Arraste para ver fachada e interior de cada loja</p>
          <a className="sr-only" href="/novidades">Novidades da Uni\u00e3o Farma</a>
        </div>
      </section>
      <HomeSections generalIntent={generalIntent} openSelector={openSelector} />
      <UnitSelectorModal intent={selectorIntent} onClose={() => setSelectorIntent(null)} />
    </>
  );
}
