"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { SITE_URL, PUBLIC_UNITS } from "./site-config";
import { getPageStructuredData } from "./structured-data";
import CabecalhoInteligente from "./shop/CabecalhoInteligente";
import ShopHeader from "./shop/ShopHeader";
import DestaquesSemana from "./shop/DestaquesSemana";
import PainelBanners from "./shop/PainelBanners";
import { FaixaInfo, SubmenuHome } from "./shop/HomeBlocos";
import { CategoriasLinha } from "./shop/ShopSections";
import { MarcasLinha } from "./shop/MarcasLinha";

/**
 * Home na estrutura da home da Panvel: cabeçalho e submenu, banner (único h1), cartões de benefícios,
 * categorias, vitrines por categoria, "como você quiser", lojas e contato. Sem FAQ no schema: não há FAQ visível.
 */
export default function HomePage() {
  const homeStructuredData = getPageStructuredData({
    name: "Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    units: PUBLIC_UNITS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }} />
      <CabecalhoInteligente>
        <ShopHeader />
        <SubmenuHome />
      </CabecalhoInteligente>
      <FaixaInfo />
      <PainelBanners titulo="Farmácia em Sabará: União Farma Nações Unidas" />
      <CategoriasLinha />
      <DestaquesSemana posicao={0} id="vitrine-higiene" titulo="Cuidado Diário" grupo="cuidado-diario" n={12} verTodas={false} source="home_higiene" />
      <DestaquesSemana posicao={1} id="vitrine-pele" titulo="Dermocosméticos" grupo="dermocosmeticos" n={12} verTodas={false} source="home_pele" />
      <DestaquesSemana posicao={2} id="vitrine-sem-receita" titulo="Medicamentos" grupo="medicamentos" n={12} verTodas={false} source="home_mips" />
      <DestaquesSemana posicao={3} id="vitrine-suplementos" titulo="Bem Estar" grupo="bem-estar" n={12} verTodas={false} source="home_suplementos" />
      <DestaquesSemana posicao={4} id="vitrine-ate-10" titulo="Até R$ 10,00" ate={1000} n={12} verTodas={false} source="home_ate_10" />
      <MarcasLinha />
      <DestaquesSemana posicao={5} id="vitrine-farmax" titulo="Farmax" lab="FARMAX" n={12} verTodas={false} source="home_farmax" />
      {/* Invisível: mantém a página de novidades ligada à home sem mudar o visual. */}
      <a className="sr-only" href="/novidades">Novidades da União Farma</a>
    </>
  );
}
