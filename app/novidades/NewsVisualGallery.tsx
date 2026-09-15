import WebImage from "../WebImage";
import { responsiveSrcSet } from "../responsive-images";
import type { NewsVisual } from "../news-content";

export default function NewsVisualGallery({ visuals }: { visuals: NewsVisual[] }) {
  return (
    <div className="news-visual-grid">
      {visuals.map((visual) => (
        <figure className="news-visual-card" key={visual.title}>
          {visual.src ? (
            <div className="news-visual-image">
              <WebImage src={visual.src} alt={visual.alt ?? ""} width={720} height={900} sizes="(max-width: 720px) 92vw, 320px" srcSet={responsiveSrcSet(visual.src, [480, 768])} />
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
