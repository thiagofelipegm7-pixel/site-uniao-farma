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
import { fetchCatalogoNacoes, formatBRL, groupByCategoria, slugify } from "./catalogo";
import { fotoDoProduto } from "./imagens";
import "./produtos.css";

// Preço muda no dia: renderiza a cada pedido (o Worker do catálogo já guarda 5 min em cache).
export const dynamic = "force-dynamic";

const SLUG = "nacoes-unidas/produtos";
const PAGE_URL = `${SITE_URL}/${SLUG}`;
const TITLE = "Produtos sem receita | União Farma Nações Unidas, Sabará";
const DESCRIPTION =
  "Seleção de produtos sem receita da União Farma Nações Unidas (Rua Inglaterra, 162, Sabará): higiene, pele e proteção solar, suplementos e isentos de prescrição, com preço do dia.";
const HEADING = "Produtos sem receita – Nações Unidas";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

const faqs: FaqItem[] = [
  {
    q: "O preço da lista é o do balcão?",
    a: `A lista vem do sistema da loja Nações Unidas e é atualizada a cada poucos minutos. Mesmo assim, confirme preço e disponibilidade no WhatsApp ${nacoes.whatsapp} antes de ir à loja.`,
  },
  {
    q: "Esta lista tem todos os produtos da loja?",
    a: "Não. É uma seleção de produtos sem receita. Medicamentos com receita, controlados e antibióticos não aparecem aqui e seguem as regras da Anvisa.",
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

function formatGeradoEm(value: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}` : null;
}

export default async function ProdutosNacoesPage({ searchParams }: { searchParams?: Promise<{ q?: string | string[] }> }) {
  const bruto = (await searchParams)?.q;
  const consultaInicial = (Array.isArray(bruto) ? bruto[0] : bruto)?.slice(0, 80) ?? "";
  const catalogo = await fetchCatalogoNacoes();
  const grupos = catalogo ? groupByCategoria(catalogo.itens) : [];
  const atualizadoEm = formatGeradoEm(catalogo?.geradoEm);
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
          {grupos.length === 0 ? (
            <p className="catalogo-vazio">
              A lista não está disponível agora. Chame a loja no{" "}
              <a href={whatsappHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={nacoes.id} data-track-source="produtos_nacoes_indisponivel">
                WhatsApp {nacoes.whatsapp}
              </a>{" "}
              e pergunte pelo produto. {getHoursSentence(nacoes)}
            </p>
          ) : (
            <CatalogoLista
              consultaInicial={consultaInicial}
              grupos={grupos.map((g) => ({
                categoria: g.categoria,
                id: slugify(g.categoria),
                itens: g.itens.map((item) => ({ nome: item.nome, lab: item.lab, isMIP: item.isMIP, precoFmt: formatBRL(item.preco), preco: item.preco, foto: fotoDoProduto(item.nome) })),
              }))}
              whatsappHref={whatsappHref}
              unitId={nacoes.id}
            />
          )}
          <p className="catalogo-nota">
            Preços do sistema da loja Nações Unidas{atualizadoEm ? `, atualizados em ${atualizadoEm}` : ""}. A loja confirma preço e estoque pelo WhatsApp antes da separação. Aqui só itens sem receita: medicamentos isentos de prescrição (MIPs), higiene e dermocosméticos. Leia a bula. Em caso de dúvida, procure o farmacêutico.
          </p>
        </div>
      </div>
      <ContentSiteFooter />
      <BarraReserva />
    </>
  );
}
