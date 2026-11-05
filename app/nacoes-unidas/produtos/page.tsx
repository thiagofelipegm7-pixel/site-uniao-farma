/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import { IconSetaDireita } from "../../reserva/ReservaIcons";
import BarraReserva from "../../shop/BarraReserva";
import ShopTopo from "../../shop/ShopTopo";
import { COMPANY } from "../../company";
import type { FaqItem } from "../../seo-content";
import { buildWhatsAppUrl, getHoursSentence, SITE_URL, UNITS } from "../../site-config";
import { getPageStructuredData, getUnitPublicPath } from "../../structured-data";
import CatalogoLista from "./CatalogoLista";
import { formatDataDosDados, formatGeradoEm } from "./catalogo";

import "./produtos.css";

// Dados vêm do JSON estático do repositório (export de 31/10/2026): a atualização é por novo PR/deploy.
const SLUG = "nacoes-unidas/produtos";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Produtos sem receita | União Farma Nações Unidas, Sabará";
const DESCRIPTION =
  "Catálogo da União Farma Nações Unidas (Rua Inglaterra, 162, Sabará): higiene, pele e proteção solar, suplementos e isentos de prescrição, com lista de preços de medicamentos com receita e controlados.";
const HEADING = "Produtos sem receita – Nações Unidas";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

const faqs: FaqItem[] = [
  {
    q: "O preço da lista é o do balcão?",
    a: `A lista vem do sistema da loja Nações Unidas, com dados de 31/10/2026, e pode estar desatualizada. Confirme preço e disponibilidade no WhatsApp ${nacoes.whatsapp} antes de ir à loja.`,
  },
  {
    q: "Esta lista tem todos os produtos da loja?",
    a: "Esta página traz os produtos sem receita, com cesta pelo WhatsApp. Medicamentos com receita e controlados ficam em listas à parte, com retirada na loja e a receita: a compra é no balcão, com a receita (retida, quando a lei exigir). Itens que não conseguimos classificar com segurança não são publicados.",
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
  const consultaInicial = "";
  const atualizadoEm = null; // precomputed if needed
  const dataDosDados = null;
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
      { name: "Produtos sem receita", url: PAGE_URL },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ShopTopo consultaInicial={consultaInicial} />
      <div className="unit-page landing-page catalogo-nacoes catalogo-loja">
        <nav className="catalogo-caminho section-inner" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <span>Produtos sem receita</span>
        </nav>
        <h1 className="catalogo-titulo section-inner">Produtos sem receita</h1>
        <div className="section-inner" id="lista">
          <CatalogoLista
              consultaInicial={consultaInicial}
              grupos={[]}
              whatsappHref={whatsappHref}
              unitId={nacoes.id}
            />
          <aside className="catalogo-aviso" aria-label="Medicamentos com receita e controlados">
            <p>
              <strong>Medicamentos com receita e controlados:</strong> pedido pelo WhatsApp, sem pagamento no site. Retire na loja com a receita (retida pela farmácia quando a lei exigir).
            </p>
            <p>
              <a href="/nacoes-unidas/produtos/receita">Ver medicamentos com receita</a> · <a href="/nacoes-unidas/produtos/controlados">Ver medicamentos controlados</a> · <a href="/nacoes-unidas/produtos/consulte-o-farmaceutico">Itens para consultar o farmacêutico</a>
            </p>
          </aside>
          <p className="catalogo-nota">
            Preços do sistema da loja Nações Unidas, com dados de {dataDosDados ?? "data não informada"}{atualizadoEm ? ` (${atualizadoEm})` : ""}. Preço e disponibilidade podem ter mudado: a loja confirma pelo WhatsApp antes da separação. Nesta lista, com cesta, só itens sem receita: medicamentos isentos de prescrição (MIPs), higiene e dermocosméticos. Leia a bula. Em caso de dúvida, procure o farmacêutico.
          </p>
        </div>
      </div>
      <ContentSiteFooter />
      <BarraReserva />
    </>
  );
}
