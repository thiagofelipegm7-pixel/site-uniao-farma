import { formatNewsDate, NEWS_VISUALS, type NewsArticle } from "../news-content";

export default function NewsCard({ article }: { article: NewsArticle }) {
  const image = article.image || {
    src: NEWS_VISUALS[0]?.src || "/novidades-og.png",
    alt: article.title,
    width: 1024,
    height: 720,
  };

  return (
    <article className="news-card">
      <div className="news-card-image">
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
      </div>
      <div className="news-card-body">
        <div className="news-card-meta">
          <span>{article.category}</span>
          <time dateTime={article.publishedAt}>{formatNewsDate(article.publishedAt)}</time>
        </div>
        <h2>{article.title}</h2>
        <p>{article.excerpt}</p>
        <a className="news-card-link" href={`/novidades/${article.slug}`}>
          Ler novidade <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}
