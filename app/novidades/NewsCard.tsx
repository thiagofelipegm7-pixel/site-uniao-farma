import WebImage from "../WebImage";
import { responsiveSrcSet } from "../responsive-images";
import { formatNewsDate, NEWS_VISUALS, type NewsArticle } from "../news-content";

const WELCOME_TITLE = "Bem-vindo à área de novidades da União Farma";

export default function NewsCard({ article }: { article: NewsArticle }) {
  const title = article.slug === "bem-vindo-area-novidades" ? WELCOME_TITLE : article.title;
  const image = article.image || {
    src: NEWS_VISUALS[0]?.src || "/novidades-og-optimized.jpg",
    alt: title,
    width: 720,
    height: 480,
  };

  return (
    <article className="news-card">
      <div className="news-card-image">
        <WebImage src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 720px) 92vw, 360px" srcSet={responsiveSrcSet(image.src, [480, 768])} />
      </div>
      <div className="news-card-body">
        <div className="news-card-meta">
          <span>{article.category}</span>
          <time dateTime={article.publishedAt}>{formatNewsDate(article.publishedAt)}</time>
        </div>
        <h2 lang="pt-BR">{title}</h2>
        <p>{article.excerpt}</p>
        <a className="news-card-link" href={`/novidades/${article.slug}`}>
          Ler novidade <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}
