/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../../ContentSiteChrome";
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

export default async function ProdutosNacoesPage() {
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
    faqs,
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
      <ContentSiteHeader activePath="/ofertas" />
      <div className="unit-page landing-page catalogo-nacoes">
        <nav className="breadcrumb section-inner" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <a href={getUnitPublicPath(nacoes)}>Nações Unidas</a>
          <span aria-hidden="true">/</span>
          <span>Produtos sem receita</span>
        </nav>

        <section className="unit-page-hero">
          <div className="section-inner unit-page-hero-grid">
            <div>
              <p className="section-kicker light">Loja Nações Unidas</p>
              <h1>{HEADING}</h1>
              <p className="unit-page-address">
                Seleção de produtos que não exigem receita, com o preço do sistema da loja na {nacoes.street}.
                {atualizadoEm ? ` Atualizado em ${atualizadoEm}.` : ""}
              </p>
              <div className="ifood-actions">
                <a
                  className="button button-whatsapp"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  data-track-event="whatsapp_click"
                  data-track-unit={nacoes.id}
                  data-track-source="produtos_nacoes_hero"
                >
                  Confirmar no WhatsApp
                </a>
              </div>
              <p className="unit-page-note">Preço e disponibilidade valem para a confirmação do dia, no WhatsApp da loja.</p>
            </div>
            <div className="unit-page-logo-card">
              <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="150" height="150" />
              <strong>Nações Unidas, Sabará</strong>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="lista">
          <div className="section-inner">
            <h2 id="lista">Lista de produtos</h2>
            {grupos.length === 0 ? (
              <p>
                A lista não está disponível agora. Chame a loja no{" "}
                <a href={whatsappHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={nacoes.id} data-track-source="produtos_nacoes_indisponivel">
                  WhatsApp {nacoes.whatsapp}
                </a>{" "}
                e pergunte pelo produto. {getHoursSentence(nacoes)}
              </p>
            ) : (
              <CatalogoLista
                grupos={grupos.map((g) => ({
                  categoria: g.categoria,
                  id: slugify(g.categoria),
                  itens: g.itens.map((item) => ({ nome: item.nome, lab: item.lab, isMIP: item.isMIP, precoFmt: formatBRL(item.preco), foto: fotoDoProduto(item.nome) })),
                }))}
                whatsappHref={whatsappHref}
                unitId={nacoes.id}
              />
            )}
          </div>
        </section>

        <section className="section" aria-labelledby="avisos">
          <div className="section-inner">
            <h2 id="avisos">Avisos importantes</h2>
            <div className="catalogo-aviso">
              {COMPANY.anvisaWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
            <p>
              Veja também a página da <a href={getUnitPublicPath(nacoes)}>loja Nações Unidas</a>. Os preços vêm do sistema da loja.
            </p>
          </div>
        </section>

        <section className="section unit-faq-section" aria-labelledby="faq">
          <div className="section-inner">
            <h2 id="faq">Perguntas frequentes</h2>
            <div className="unit-faq-list">
              {faqs.map((faq) => (
                <details key={faq.q} className="unit-faq-item" open>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
