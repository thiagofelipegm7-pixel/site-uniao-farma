/* eslint-disable @next/next/no-html-link-for-pages -- Use native navigation with the current Vinext runtime. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { getPublishedNews, NEWS_VISUALS } from "../news-content";
import { SITE_URL } from "../site-config";
import NewsCard from "./NewsCard";
import NewsVisualGallery from "./NewsVisualGallery";

const title = "Novidades da União Farma em Sabará | União Farma";
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
        url: `${SITE_URL}/novidades-og.png`,
        width: 1732,
        height: 908,
        alt: "Novidades da União Farma — informações e conteúdos para quem está em Sabará",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${SITE_URL}/novidades-og.png`],
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

export default function NewsIndexPage() {
  const articles = getPublishedNews();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <a className="skip-link" href="#conteudo-novidades">Pular para o conteúdo</a>
      <ContentSiteHeader activePath="/novidades" />

      <main id="conteudo-novidades" className="news-page">
        <section className="news-hero" aria-labelledby="news-title">
          <div className="section-inner news-hero-inner">
            <p className="eyebrow">Novidades da União Farma</p>
            <h1 id="news-title">Novidades, informações e conteúdos da União Farma</h1>
            <p>
              Acompanhe novidades das nossas unidades, informações úteis, campanhas e conteúdos preparados para quem está em Sabará.
            </p>
          </div>
        </section>

        <nav className="breadcrumb section-inner news-index-breadcrumb" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>Novidades</span>
        </nav>

        <section className="section news-visual-highlights" aria-labelledby="news-visual-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">Destaques da União Farma</p>
              <h2 id="news-visual-title">Novidades em destaque</h2>
              <p>Confira as artes e novidades compartilhadas pela União Farma. Consulte a equipe sobre disponibilidade e orientações.</p>
            </div>
            <NewsVisualGallery visuals={NEWS_VISUALS} />
          </div>
        </section>

        <section className="section news-list" aria-labelledby="news-list-title">
          <div className="section-inner">
            <div className="section-heading compact-heading">
              <p className="section-kicker">Conteúdo da União Farma</p>
              <h2 id="news-list-title">Publicações recentes</h2>
              <p>Informações institucionais e conteúdos revisados antes da publicação.</p>
            </div>
            {articles.length > 0 ? (
              <div className="news-grid">
                {articles.map((article) => <NewsCard key={article.slug} article={article} />)}
              </div>
            ) : (
              <div className="news-empty" role="status">
                <h2>Em breve</h2>
                <p>Em breve, novas informações serão publicadas por aqui.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <ContentSiteFooter notice="Os conteúdos desta área são informativos. Para confirmar atendimento, entrega ou disponibilidade, fale diretamente com uma unidade." />
    </>
  );
}
