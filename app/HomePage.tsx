"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { SITE_URL, UNITS } from "./site-config";
import { getPageStructuredData } from "./structured-data";
import LojasCartoes from "./shop/LojasCartoes";
import OfertasSemana from "./OfertasSemana";
import LojaBar from "./shop/LojaBar";
import ShopHeader from "./shop/ShopHeader";
import DestaquesSemana from "./shop/DestaquesSemana";
import { AbasHome, BarraInfo, ComoContato, ComoQuiser, SubmenuHome } from "./shop/HomeBlocos";
import { CategoriasLinha, HeroReserva } from "./shop/ShopSections";

/**
 * Home na estrutura da home da Panvel: cabeçalho e submenu, abas, banner (único h1), cartões de benefícios, categorias,
 * Ofertas da semana, vitrines por categoria, "como você quiser", lojas e contato. Sem FAQ no schema: não há FAQ visível.
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
      <SubmenuHome />
      <LojaBar />
      <AbasHome />
      <HeroReserva />
      <BarraInfo />
      <CategoriasLinha />
      <OfertasSemana />
      <DestaquesSemana id="vitrine-higiene" titulo="Higiene e perfumaria" grupo="perfumaria-e-higiene" n={10} verTodasHref="/nacoes-unidas/produtos#perfumaria-e-higiene" source="home_higiene" />
      <DestaquesSemana id="vitrine-pele" titulo="Pele e proteção solar" grupo="pele-e-protecao-solar" n={10} verTodasHref="/nacoes-unidas/produtos#pele-e-protecao-solar" source="home_pele" />
      <DestaquesSemana id="vitrine-sem-receita" titulo="Medicamentos isentos de prescrição" grupo="medicamentos-isentos-de-prescricao" n={10} verTodasHref="/nacoes-unidas/produtos#medicamentos-isentos-de-prescricao" source="home_mips" />
      <DestaquesSemana id="vitrine-suplementos" titulo="Suplementos e alimentos" grupo="suplementos-e-alimentos" n={10} verTodasHref="/nacoes-unidas/produtos#suplementos-e-alimentos" source="home_suplementos" />
      <ComoQuiser />
      <LojasCartoes />
      <ComoContato />
      {/* Invisível: mantém a página de novidades ligada à home sem mudar o visual. */}
      <a className="sr-only" href="/novidades">Novidades da União Farma</a>
    </>
  );
}
