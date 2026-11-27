"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { SITE_URL, PUBLIC_UNITS } from "./site-config";
import { getPageStructuredData } from "./structured-data";
import CabecalhoInteligente from "./shop/CabecalhoInteligente";
import ShopHeader from "./shop/ShopHeader";
import DestaquesSemana from "./shop/DestaquesSemana";
import OfertasSemana from "./shop/OfertasSemana";
import PainelBanners from "./shop/PainelBanners";
import NotasGoogle from "./shop/NotasGoogle";
import { FaixaInfo } from "./shop/HomeBlocos";
import { CategoriasLinha } from "./shop/ShopSections";
import { MarcasLinha } from "./shop/MarcasLinha";
import CestaRetomada from "./shop/CestaRetomada";
import VistoRecentemente from "./shop/VistoRecentemente";
import MaisPedidosChips from "./shop/MaisPedidosChips";
import CheckoutRapido from "./shop/CheckoutRapido";
import FiltroPreco from "./shop/FiltroPreco";
import RecomendacoesReais from "./shop/RecomendacoesReais";
import ModoEconomia from "./shop/ModoEconomia";
import SugestaoKit from "./shop/SugestaoKit";
import { vitrineHome } from "./shop/home-vitrines";
import type { DadosDaHome } from "./shop/destaques-servidor";

/**
 * Home na estrutura da home da Panvel: cabeçalho e submenu, banner (único h1), cartões de benefícios,
 * categorias, vitrines por categoria, "como você quiser", lojas e contato. Sem FAQ no schema: não há FAQ visível.
 */
export default function HomePage({ dados = {} }: { dados?: Partial<DadosDaHome> } = {}) {
  /** Uma vitrine da home, com os produtos que o servidor já escolheu (se houver). */
  const vitrine = (id: string) => {
    const v = vitrineHome(id);
    return <DestaquesSemana posicao={v.posicao} id={v.id} titulo={v.titulo} grupo={v.grupo} lab={v.lab} ate={v.ate} ordem={v.ordem} minimo={v.minimo} n={v.n} verTodas={false} source={v.source} inicial={dados.vitrines?.[v.id]} />;
  };
  const homeStructuredData = getPageStructuredData({
    name: "Drogaria e Farmácia em Sabará | União Farma",
    url: `${SITE_URL}/`,
    units: PUBLIC_UNITS,
    breadcrumbs: [{ name: "Início", url: `${SITE_URL}/` }],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }} />
      <CabecalhoInteligente>
        <ShopHeader />
        <FaixaInfo />
      </CabecalhoInteligente>
      <PainelBanners titulo="Drogaria em Sabará: União Farma Nações Unidas" inicial={dados.banners} />
      <NotasGoogle className="notas-google--home" />
      <CheckoutRapido />
      <MaisPedidosChips inicial={dados.chips} />
      <FiltroPreco />
      <CestaRetomada />
      <RecomendacoesReais />
      <OfertasSemana inicial={dados.ofertas} />
      <VistoRecentemente />
      <ModoEconomia />
      <SugestaoKit />
      {vitrine("vitrine-mais-pedidos")}
      {vitrine("vitrine-higiene")}
      {vitrine("vitrine-farmax")}
      {vitrine("vitrine-pele")}
      {vitrine("vitrine-sem-receita")}
      <CategoriasLinha />
      {vitrine("vitrine-suplementos")}
      {vitrine("vitrine-dove")}
      {vitrine("vitrine-ate-10")}
      <MarcasLinha />
      {/* Invisível: mantém a página de novidades ligada à home sem mudar o visual. */}
      <a className="sr-only" href="/novidades">Novidades da União Farma</a>
    </>
  );
}
