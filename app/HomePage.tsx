"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep the Novidades route working in Vinext production. */

import { useState } from "react";
import { trackEvent } from "./analytics";
import { SITE_URL, UNITS } from "./site-config";
import { HOME_FAQS } from "./seo-content";
import { getPageStructuredData } from "./structured-data";
import type { SelectorIntent } from "./home-chrome";
import UnitSelectorModal from "./UnitSelectorModal";
import { HomeSections } from "./home-sections";
import UnitsShowcase from "./UnitsShowcase";
import BrandStrip from "./BrandStrip";
import OfertasSemana from "./OfertasSemana";
import { FarmaceuticoCard } from "./visual-fase2";
import LojaBar from "./shop/LojaBar";
import ShopHeader from "./shop/ShopHeader";
import DestaquesSemana from "./shop/DestaquesSemana";
import { CategoriasLinha, ComoFunciona, HeroReserva } from "./shop/ShopSections";

export default function HomePage() {
  const [selectorIntent, setSelectorIntent] = useState<SelectorIntent | null>(null);
  const homeStructuredData = getPageStructuredData({
    name: "Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    faqs: HOME_FAQS,
    units: UNITS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

  const openSelector = (intent: SelectorIntent) => {
    trackEvent("unit_selector_open", { intent: intent.eventName });
    setSelectorIntent(intent);
  };

  const generalIntent: SelectorIntent = {
    title: "Qual loja fica melhor para você?",
    description: "Fátima, Nações ou Itacolomi. A conversa abre no WhatsApp da unidade certa.",
    message: "Oi, União Farma {unidade}! Quero consultar um produto. Posso mandar o nome?",
    eventName: "consulta_geral",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }} />
      <ShopHeader />
      <BrandStrip semSacola />
      <LojaBar />
      <CategoriasLinha />
      <HeroReserva />
      <OfertasSemana />
      <DestaquesSemana />
      <ComoFunciona />
      <UnitsShowcase />
      <div className="section-inner">
        <FarmaceuticoCard />
      </div>
      <section className="seo-intro section-inner" aria-labelledby="seo-intro-title">
        <p className="eyebrow">{"Três farmácias em Sabará"}</p>
        <h2 id="seo-intro-title">{"Farmácia em Sabará: 3 lojas perto de você"}</h2>
        <p className="hero-lead">{"Fátima, Nações Unidas e Itacolomi."}</p>
        <a className="sr-only" href="/novidades">{"Novidades da União Farma"}</a>
      </section>
      <HomeSections generalIntent={generalIntent} openSelector={openSelector} />
      <UnitSelectorModal intent={selectorIntent} onClose={() => setSelectorIntent(null)} />
    </>
  );
}
