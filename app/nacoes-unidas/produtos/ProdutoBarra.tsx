"use client";

import { trackEvent } from "../../analytics";
import { abrirReserva } from "../../reserva/abrir-reserva";
import { IconLixeira, IconMais, IconMenos } from "../../reserva/ReservaIcons";
import { adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem } from "../../reserva/reserva-store";
import { useReserva } from "../../reserva/useReserva";

type Props = {
  unitId: string;
  nome: string;
  precoCentavos: number;
  foto?: string | null;
};

/** Barra fixa da página do produto. O nome fica na tela, não no analytics. */
export default function ProdutoBarra({ unitId, nome, precoCentavos, foto }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);

  if (qtd === 0) {
    return (
      <div className="produto-barra">
        <button
          type="button"
          className="produto-adicionar"
          onClick={() => {
            atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, foto }));
            trackEvent("reserva_add", { unit: unitId, source: "produto_nacoes" });
          }}
        >
          <IconMais size={22} />
          Adicionar à cesta
        </button>
      </div>
    );
  }

  return (
    <div className="produto-barra">
      <div className="reservar-contador produto-contador" role="group" aria-label={`Quantidade de ${nome} na cesta`}>
        <button type="button" aria-label={qtd === 1 ? `Remover ${nome} da cesta` : `Diminuir ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd - 1))}>
          {qtd === 1 ? <IconLixeira size={20} /> : <IconMenos size={20} />}
        </button>
        <output aria-live="polite">{qtd}</output>
        <button type="button" aria-label={`Aumentar ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd + 1))}>
          <IconMais size={20} />
        </button>
      </div>
      <button type="button" className="produto-ver-reserva" onClick={() => abrirReserva()}>
        Ver cesta
      </button>
    </div>
  );
}
