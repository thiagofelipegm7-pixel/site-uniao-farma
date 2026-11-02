"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { SITE_URL, UNITS } from "./site-config";
import { getPageStructuredData } from "./structured-data";
import LojasCartoes from "./shop/LojasCartoes";
import BrandStrip from "./BrandStrip";
import OfertasSemana from "./OfertasSemana";
import LojaBar from "./shop/LojaBar";
import ShopHeader from "./shop/ShopHeader";
import DestaquesSemana from "./shop/DestaquesSemana";
import { CategoriasLinha, ComoFunciona, HeroReserva } from "./shop/ShopSections";

/**
 * Home igual ao protótipo: casca de loja, cartão marinho (único h1), Ofertas da semana, Destaques da semana,
 * Como funciona e Nossas lojas. Sem FAQ no schema: não há FAQ visível na página.
 */
export default function HomePage() {
  const homeStructuredData = getPageStructuredData({
    name: "Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    units: UNITS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

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
      <LojasCartoes />
      {/* Invisível: mantém a página de novidades ligada à home sem mudar o visual. */}
      <a className="sr-only" href="/novidades">Novidades da União Farma</a>
    </>
  );
}
