import { formatNewsDate, type NewsArticle } from "../news-content";

export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className={`news-card${article.image ? "" : " news-card-no-image"}`}>
      {article.image && (
        <div className="news-card-image">
          <img
            src={article.image.src}
            alt={article.image.alt}
            width={article.image.width}
            height={article.image.height}
            loading="lazy"
          />
        </div>
      )}
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
