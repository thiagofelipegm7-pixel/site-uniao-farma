import type { NewsVisual } from "../news-content";

export default function NewsVisualGallery({ visuals }: { visuals: NewsVisual[] }) {
  return (
    <div className="news-visual-grid">
      {visuals.map((visual) => (
        <figure className="news-visual-card" key={visual.title}>
          {visual.src ? (
            <div className="news-visual-image">
              <img src={visual.src} alt={visual.alt ?? ""} width="1024" height="1280" loading="lazy" />
            </div>
          ) : (
            <div className="news-visual-placeholder" aria-hidden="true">União Farma</div>
          )}
          <figcaption>
            <strong>{visual.title}</strong>
            <span>{visual.caption}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
