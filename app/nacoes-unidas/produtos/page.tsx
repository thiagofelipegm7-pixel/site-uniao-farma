/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { preload } from "react-dom";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import { IconSetaDireita } from "../../reserva/ReservaIcons";
import BarraReserva from "../../shop/BarraReserva";
import { MarcasLinha } from "../../shop/MarcasLinha";
import PainelBanners from "../../shop/PainelBanners";
import ShopTopo from "../../shop/ShopTopo";
import { COMPANY } from "../../company";
import type { FaqItem } from "../../seo-content";
import { buildWhatsAppUrl, getHoursSentence, SITE_URL, UNITS } from "../../site-config";
import { getPageStructuredData, getUnitPublicPath } from "../../structured-data";
import CatalogoLista from "./CatalogoLista";
import { carregarCatalogoNacoes, formatDataDosDados, formatGeradoEm } from "./catalogo";
import { URL_BUSCA_INDEX } from "./busca-index";

import "./produtos.css";

// Dados vêm do JSON do repositório, atualizado sozinho pela sincronização com o PC da loja (.github/workflows/catalogo-sync.yml).
const SLUG = "nacoes-unidas/produtos";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Todos os produtos | União Farma Nações Unidas, Sabará";
const DESCRIPTION =
  "Catálogo da União Farma Nações Unidas (Rua Inglaterra, 162, Sabará): higiene, pele e proteção solar, suplementos e isentos de prescrição, com lista de preços de medicamentos com receita e controlados.";
const HEADING = "Todos os produtos – Nações Unidas";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

const geradoEmDosDados = carregarCatalogoNacoes().geradoEm;
const diaDosDados = formatDataDosDados(geradoEmDosDados);

const faqs: FaqItem[] = [
  {
    q: "O preço da lista é o do balcão?",
    a: `A lista vem do sistema da loja Nações Unidas, ${diaDosDados ? `com dados de ${diaDosDados}` : "com dados recentes"}, e pode estar desatualizada. Confirme preço e disponibilidade no WhatsApp ${nacoes.whatsapp} antes de ir à loja.`,
  },
  {
    q: "Esta lista tem todos os produtos da loja?",
    a: "Esta página traz os produtos sem receita, com cesta pelo WhatsApp. Medicamentos com receita ficam em lista à parte, com retirada na loja e a receita. Os de controle especial (Portaria 344) não são vendidos pelo site: a compra é só no balcão, com a Notificação de Receita (retida pela farmácia). Itens que não conseguimos classificar com segurança não são publicados.",
  },
  {
    q: "Dá para receber em casa?",
    a: "Chame a loja no WhatsApp para saber taxa e prazo de entrega no seu bairro.",
  },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `/${SLUG}` },
  // Fica fora do Google até o dono aprovar (ver PR). Para indexar: remover esta linha e registrar no sitemap.
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/og-nacoes-unidas.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-nacoes-unidas.jpg"] },
};

export default async function ProdutosNacoesPage() {
  // A lista lê o catálogo inteiro de um arquivo só: o navegador começa a baixar junto com o HTML, antes do JavaScript.
  preload(URL_BUSCA_INDEX, { as: "fetch", crossOrigin: "anonymous" });
  const consultaInicial = "";
  const atualizadoEm = null;
  const dataDosDados = formatGeradoEm(geradoEmDosDados);
  const whatsappHref = buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Vi a lista de produtos no site e quero confirmar preço e disponibilidade.", {
    campaign: "produtos_nacoes",
    content: "nacoes_lista",
  });

  const structuredData = getPageStructuredData({
    name: TITLE,
    url: PAGE_URL,
    units: [nacoes],
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: "Nações Unidas", url: `${SITE_URL}${getUnitPublicPath(nacoes)}` },
      { name: "Todos os produtos", url: PAGE_URL },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ShopTopo consultaInicial={consultaInicial} />
      <PainelBanners />
      <div className="unit-page landing-page catalogo-nacoes catalogo-loja">
        <nav className="catalogo-caminho section-inner" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <span>Todos os produtos</span>
        </nav>
        <h1 className="catalogo-titulo section-inner">Todos os produtos</h1>
        <div className="section-inner marcas-pagina">
          <MarcasLinha />
        </div>
        <div className="section-inner" id="lista">
          <CatalogoLista
              consultaInicial={consultaInicial}
              grupos={[]}
              whatsappHref={whatsappHref}
              unitId={nacoes.id}
            />
        </div>
      </div>
      <ContentSiteFooter />
      <BarraReserva />
    </>
  );
}
