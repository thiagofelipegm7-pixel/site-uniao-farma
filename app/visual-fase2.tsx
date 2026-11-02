import { UNIT_GOOGLE_PROFILES } from "./google-reviews";
import { IconKit, IconLojaFrente } from "./reserva/ReservaIcons";
import type { Unit } from "./site-config";

export function EtiquetaOferta() {
  return <span className="etiqueta-oferta">Oferta</span>;
}

/** Nota confirmada do Google e a faixa de retirada, nesta ordem. */
export function NotaEFaixaLoja({ unitId }: { unitId: Unit["id"] }) {
  const perfil = UNIT_GOOGLE_PROFILES.find((item) => item.unitId === unitId);
  const nota = perfil?.rating != null ? perfil.rating.toFixed(1).replace(".", ",") : null;
  const avaliacoes = perfil?.reviewCount != null ? ` · ${perfil.reviewCount} avaliações no Google` : " no Google";
  return (
    <>
      {nota ? <p className="loja-nota">{nota}{avaliacoes}</p> : null}
      <p className="loja-retirada">
        <IconLojaFrente size={20} />
        <span>Reserve aqui, retire e pague no balcão</span>
      </p>
    </>
  );
}

export function FarmaceuticoCard() {
  return (
    <aside className="farmaceutico-card">
      <IconKit size={32} />
      <div>
        <strong>João, farmacêutico responsável</strong>
        <p>CRF/MG 31958 · responsável técnico das 3 lojas. Dúvida sobre um produto? Pergunte pelo WhatsApp.</p>
      </div>
    </aside>
  );
}
