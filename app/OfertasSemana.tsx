"use client";

import { useEffect, useState } from "react";
import ReservarBotao from "./reserva/ReservarBotao";
import Preco from "./nacoes-unidas/produtos/Preco";
import { slugify } from "./nacoes-unidas/produtos/catalogo";
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
  return (
    <p className="semana-preco">
      <Preco precoFmt={formatOfferPrice(valor)} variante="selo" />
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
                <a href={`/nacoes-unidas/produtos/${slugify(offer.name)}`} className="semana-link">
                {offer.image ? (
                  <img className="semana-foto" src={offer.image} alt="" width="112" height="112" />
                ) : (
                  <span className="semana-foto semana-foto-vazia">{offer.placeholderLabel ?? "Oferta"}</span>
                )}
                <div className="semana-info">
                  <h3 className="semana-nome">{offer.name}</h3>
                  {anterior !== null ? <p className="semana-de">De {formatOfferPrice(anterior)}</p> : <p className="semana-de semana-de-vazio" aria-hidden="true" />}
                  <EtiquetaPreco valor={preco} />
                </div>
                </a>
                  <ReservarBotao
                    unitId={loja}
                    nome={offer.name}
                    precoCentavos={precoOfertaCentavos(preco)}
                    deCentavos={anterior !== null ? precoOfertaCentavos(anterior) : undefined}
                    foto={offer.image}
                    source="ofertas_semana"
                  />
              </article>
            </li>
          );
        })}
      </ul>
      <p className="semana-rodape">Ofertas válidas enquanto durar o estoque em cada loja.</p>
    </section>
  );
}
