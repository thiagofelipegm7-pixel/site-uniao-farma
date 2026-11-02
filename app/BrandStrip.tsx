import ReservaSacola from "./reserva/ReservaSacola";

/** Faixa de identidade da União Farma: selo de coração, o lema da casa e a sacola da reserva. */
export default function BrandStrip({ semSacola = false }: { semSacola?: boolean }) {
  return (
    <div className="brand-strip">
      <span className="brand-strip-heart" aria-hidden="true">
        <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor">
          <path d="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z" />
        </svg>
      </span>
      <span className="brand-strip-pill">saúde e cuidado lado a lado.</span>
      {semSacola ? <span aria-hidden="true" /> : <ReservaSacola />}
    </div>
  );
}
