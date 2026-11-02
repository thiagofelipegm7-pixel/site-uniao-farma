"use client";

import { useEffect, useState } from "react";
import ReservarBotao from "./reserva/ReservarBotao";
import { readPreferredUnitId } from "./preferred-unit";
import { IconCoracao } from "./reserva/ReservaIcons";
import {
  formatOfferPrice,
  getPublicOffers,
  lojaParaReserva,
  precoAnteriorConfirmado,
  precoOfertaCentavos,
  selecionarOfertasSemana,
} from "./offers";

function EtiquetaPreco({ valor }: { valor: number }) {
  const centavos = precoOfertaCentavos(valor);
  const reais = Math.floor(centavos / 100).toLocaleString("pt-BR");
  const cents = String(centavos % 100).padStart(2, "0");
  return (
    <p className="semana-preco">
      <span className="sr-only">{formatOfferPrice(valor)}</span>
      <span aria-hidden="true" className="semana-preco-cifrao">R$</span>
      <span aria-hidden="true" className="semana-preco-inteiro">{reais}</span>
      <span aria-hidden="true" className="semana-preco-cents">,{cents}</span>
    </p>
  );
}

/** Painel verde da home. No máximo 3 ofertas reais. "De" só com preço anterior confirmado. */
export default function OfertasSemana() {
  const [preferida, setPreferida] = useState<ReturnType<typeof readPreferredUnitId>>(null);
  useEffect(() => {
    const sync = () => setPreferida(readPreferredUnitId());
    sync();
    window.addEventListener("uf-preferred-unit", sync);
    return () => window.removeEventListener("uf-preferred-unit", sync);
  }, []);
  const ofertas = selecionarOfertasSemana(getPublicOffers());
  if (ofertas.length === 0) return null;

  return (
    <section className="semana-painel" id="ofertas-da-semana" aria-labelledby="ofertas-semana-titulo">
      <div className="semana-topo">
        <div>
          <p className="semana-sub">Preço e estoque confirmados pela loja</p>
          <h2 id="ofertas-semana-titulo">OFERTAS DA SEMANA</h2>
        </div>
        <span className="semana-coracao" aria-hidden="true">
          <IconCoracao size={34} />
        </span>
      </div>

      <ul className="semana-lista">
        {ofertas.map((offer) => {
          const anterior = precoAnteriorConfirmado(offer);
          const loja = lojaParaReserva(offer, preferida);
          const preco = offer.currentPrice;
          if (preco === null || !loja) return null;
          return (
            <li key={offer.id}>
              <article className="semana-card">
                {offer.image ? (
                  <img className="semana-foto" src={offer.image} alt="" width="112" height="112" />
                ) : (
                  <span className="semana-foto semana-foto-vazia">{offer.placeholderLabel ?? "Oferta"}</span>
                )}
                <div className="semana-info">
                  <h3 className="semana-nome">{offer.name}</h3>
                  {anterior !== null ? <p className="semana-de">De {formatOfferPrice(anterior)}</p> : null}
                  <EtiquetaPreco valor={preco} />
                  <ReservarBotao
                    unitId={loja}
                    nome={offer.name}
                    precoCentavos={precoOfertaCentavos(preco)}
                    foto={offer.image}
                    source="ofertas_semana"
                  />
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <a className="semana-todas" href="/ofertas">Ver todas as ofertas</a>
      <p className="semana-rodape">A loja confirma preço e estoque pelo WhatsApp. Ofertas válidas enquanto durar o estoque em cada loja.</p>
    </section>
  );
}
