/* eslint-disable @next/next/no-html-link-for-pages -- Use native navigation with the current Vinext runtime. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter, ContentSiteHeader } from "../../ContentSiteChrome";
import {
  formatNewsDate,
  getNewsArticle,
  getPublishedNews,
  getRelatedNews,
  type NewsContentBlock,
} from "../../news-content";
import { SITE_URL } from "../../site-config";
import NewsCard from "../NewsCard";
import NewsContactCta from "../NewsContactCta";

type NewsPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedNews().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getNewsArticle(slug);
  if (!article) return { title: "Novidade não encontrada" };

  const url = `${SITE_URL}/novidades/${article.slug}`;
  const images = article.image
    ? [{ url: article.image.src, width: article.image.width, height: article.image.height, alt: article.image.alt }]
    : undefined;

  return {
    title: { absolute: `${article.seo.title} | União Farma` },
    description: article.seo.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${article.seo.title} | União Farma`,
      description: article.seo.description,
      url,
      type: "article",
      publishedTime: article.publishedAt,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${article.seo.title} | União Farma`,
      description: article.seo.description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
    robots: { index: true, follow: true },
  };
}

function ContentBlock({ block }: { block: NewsContentBlock }) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "heading") {
    return block.level === 2 ? <h2>{block.text}</h2> : <h3>{block.text}</h3>;
  }
  return (
    <ul className="news-internal-links">
      {block.items.map((item) => (
        <li key={item.href}><a href={item.href}>{item.label} <span aria-hidden="true">→</span></a></li>
      ))}
    </ul>
  );
}

export default async function NewsArticlePage({ params }: NewsPageProps) {
  const { slug } = await params;
  const article = getNewsArticle(slug);
  if (!article) notFound();

  const pageUrl = `${SITE_URL}/novidades/${article.slug}`;
  const related = getRelatedNews(article);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(article.image ? { image: `${SITE_URL}${article.image.src}` } : {}),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Novidades", item: `${SITE_URL}/novidades` },
      { "@type": "ListItem", position: 3, name: article.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([articleSchema, breadcrumbSchema]) }} />
      <a className="skip-link" href="#conteudo-novidade">Pular para o conteúdo</a>
      <ContentSiteHeader activePath="/novidades" />

      <main id="conteudo-novidade" className="news-article-page">
        <nav className="breadcrumb section-inner news-article-breadcrumb" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <a href="/novidades">Novidades</a>
          <span aria-hidden="true">/</span>
          <span>{article.title}</span>
        </nav>

        <article>
          <header className="news-article-header">
            <div className="section-inner news-article-header-inner">
              <p className="section-kicker">{article.category}</p>
              <h1>{article.title}</h1>
              <p>{article.excerpt}</p>
              <time dateTime={article.publishedAt}>{formatNewsDate(article.publishedAt)}</time>
            </div>
          </header>

          {article.image && (
            <figure className="section-inner news-article-image">
              <img src={article.image.src} alt={article.image.alt} width={article.image.width} height={article.image.height} />
            </figure>
          )}

          <div className="section-inner news-article-layout">
            <div className="news-article-content">
              {article.content.map((block, index) => <ContentBlock key={`${block.type}-${index}`} block={block} />)}
              {article.cta?.mode === "link" && article.cta.href && (
                <a className="button button-whatsapp" href={article.cta.href}>{article.cta.label}</a>
              )}
              <a className="news-back-link" href="/novidades">← Voltar às novidades</a>
            </div>
          </div>

          {article.cta?.mode === "unit_contact" && (
            <div className="section-inner news-contact-wrap">
              <NewsContactCta articleTitle={article.title} label={article.cta.label} />
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="section news-related" aria-labelledby="news-related-title">
            <div className="section-inner">
              <div className="section-heading compact-heading">
                <p className="section-kicker">Continue lendo</p>
                <h2 id="news-related-title">Conteúdos relacionados</h2>
              </div>
              <div className="news-grid">{related.map((item) => <NewsCard key={item.slug} article={item} />)}</div>
            </div>
          </section>
        )}
      </main>

      <ContentSiteFooter notice="Este conteúdo é informativo. Para confirmar atendimento, entrega ou disponibilidade, fale diretamente com uma unidade." />
    </>
  );
}
