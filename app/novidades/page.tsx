/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { getPublishedNews, groupNewsByCategory, NEWS_VISUALS } from "../news-content";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";
import { SITE_URL } from "../site-config";
import NewsCard from "./NewsCard";
import NewsVisualGallery from "./NewsVisualGallery";
import "../news-fix.css";
import "./blog.css";

const title = "Novidades da União Farma em Sabará";
const description =
  "Acompanhe novidades da União Farma em Sabará e consulte as unidades para informações sobre disponibilidade.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/novidades" },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/novidades`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/novidades-og-optimized.jpg`,
        width: 1200,
        height: 629,
        alt: "Novidades da União Farma — informações e conteúdos para quem está em Sabará",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${SITE_URL}/novidades-og-optimized.jpg`],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/novidades#webpage`,
      url: `${SITE_URL}/novidades`,
      name: title,
      description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "pt-BR",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Novidades", item: `${SITE_URL}/novidades` },
      ],
    },
  ],
};

const nacoes = PUBLIC_UNITS.find((u) => u.id === "nacoes");

/** O que a loja de verdade oferece (o mesmo que o resto do site diz): sem serviço inventado. */
const SERVICOS = [
  { titulo: "Pedido pelo WhatsApp", texto: "Monte a cesta no site e envie para a loja. Nada é cobrado no site.", href: "/nacoes-unidas/produtos", acao: "Ver produtos" },
  { titulo: "Entrega em Sabará", texto: "Confira os bairros atendidos e a taxa antes de pedir.", href: "/entrega-de-medicamentos-em-sabara", acao: "Ver entrega" },
  { titulo: "Retire na loja", texto: "Retirada sem taxa na loja Nações Unidas, em Sabará.", href: "/#unidades-rapidas", acao: "Ver a loja" },
] as const;

export default function NewsIndexPage() {
  const articles = getPublishedNews();
  const grupos = groupNewsByCategory(articles);
  const [destaque, ...maisRecentes] = articles;
  // O que já aparece em "Últimos conteúdos" não se repete nas seções de categoria (a seção some se não sobrar nada).
  const jaMostrados = new Set([destaque, ...maisRecentes.slice(0, 3)].filter(Boolean).map((a) => a!.slug));
  const secoes = grupos.map((g) => ({ ...g, artigos: g.artigos.filter((a) => !jaMostrados.has(a.slug)) })).filter((g) => g.artigos.length > 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ContentSiteHeader activePath="/novidades" />

      <div className="news-page">
        <section className="news-hero" aria-labelledby="news-title">
          <div className="section-inner news-hero-inner">
            <p className="eyebrow">Novidades da União Farma</p>
            <h1 id="news-title">Novidades da União Farma</h1>
            <p>Artes, informações das lojas e o que a equipe publicou para Sabará.</p>
          </div>
          {grupos.length > 0 ? (
            <nav className="section-inner blog-categorias" aria-label="Categorias">
              {grupos.map((g) => <a key={g.slug} href={`#cat-${g.slug}`}>{g.nome}</a>)}
            </nav>
          ) : null}
        </section>

        <nav className="breadcrumb section-inner news-index-breadcrumb" aria-label="Navegação estrutural">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>Novidades</span>
        </nav>

        <section className="section news-visual-highlights" aria-labelledby="news-visual-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">Destaques</p>
              <h2 id="news-visual-title">Novidades em destaque</h2>
            </div>
            <NewsVisualGallery visuals={NEWS_VISUALS} />
          </div>
        </section>

        {destaque ? (
          <section className="section news-list" aria-labelledby="news-list-title">
            <div className="section-inner">
              <div className="section-heading compact-heading">
                <p className="section-kicker">Publicações</p>
                <h2 id="news-list-title">Últimos conteúdos</h2>
              </div>
              <div className="blog-ultimos">
                <NewsCard article={destaque} nivel="h3" grande />
                {maisRecentes.slice(0, 3).map((article) => <NewsCard key={article.slug} article={article} nivel="h3" />)}
              </div>
            </div>
          </section>
        ) : (
          <section className="section news-list" aria-labelledby="news-list-title">
            <div className="section-inner">
              <div className="news-empty" role="status">
                <h2 id="news-list-title">Em breve</h2>
                <p>Em breve, novas informações serão publicadas por aqui.</p>
              </div>
            </div>
          </section>
        )}

        {secoes.map((g) => (
          <section key={g.slug} className="section blog-categoria" id={`cat-${g.slug}`} aria-labelledby={`cat-titulo-${g.slug}`}>
            <div className="section-inner">
              <div className="section-heading compact-heading">
                <h2 id={`cat-titulo-${g.slug}`}>{g.nome}</h2>
              </div>
              <div className="news-grid">
                {g.artigos.slice(0, 6).map((article) => <NewsCard key={article.slug} article={article} nivel="h3" />)}
              </div>
            </div>
          </section>
        ))}

        <section className="section blog-servicos" aria-labelledby="blog-servicos-titulo">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">Na loja</p>
              <h2 id="blog-servicos-titulo">Serviços da União Farma</h2>
            </div>
            <ul className="blog-servicos-lista">
              {SERVICOS.map((servico) => (
                <li key={servico.titulo}>
                  <h3>{servico.titulo}</h3>
                  <p>{servico.texto}</p>
                  <a href={servico.href}>{servico.acao} <span aria-hidden="true">→</span></a>
                </li>
              ))}
              {nacoes ? (
                <li>
                  <h3>Dúvidas sobre produtos</h3>
                  <p>Fale com a equipe da loja pelo WhatsApp. Para orientação de saúde, procure o farmacêutico.</p>
                  <a href={buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Vi o blog e tenho uma dúvida.", { campaign: "blog", content: "servicos" })} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="blog_servicos">Chamar no WhatsApp <span aria-hidden="true">→</span></a>
                </li>
              ) : null}
            </ul>
          </div>
        </section>
      </div>

      <ContentSiteFooter notice="Os conteúdos desta área são informativos. Para confirmar atendimento, entrega ou disponibilidade, fale diretamente com uma unidade." />
    </>
  );
}
