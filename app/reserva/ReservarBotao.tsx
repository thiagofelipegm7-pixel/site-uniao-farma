"use client";

import { trackEvent } from "../analytics";
import { IconLixeira, IconMais, IconMenos } from "./ReservaIcons";
import { adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem } from "./reserva-store";
import { useReserva } from "./useReserva";

type Props = {
  unitId: string;
  nome: string;
  precoCentavos: number;
  foto?: string | null;
};

/** Botão "+" que vira contador depois do primeiro toque (como no protótipo). Sem texto do produto no analytics. */
export default function ReservarBotao({ unitId, nome, precoCentavos, foto }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);

  if (qtd === 0) {
    return (
      <button
        type="button"
        className="reservar-mais"
        aria-label={`Adicionar ${nome} à reserva`}
        onClick={() => {
          atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, foto }));
          trackEvent("reserva_add", { unit: unitId, source: "catalogo" });
        }}
      >
        <IconMais size={22} />
        <span>Reservar</span>
      </button>
    );
  }

  return (
    <div className="reservar-contador" role="group" aria-label={`Quantidade de ${nome} na reserva`}>
      <button type="button" aria-label={qtd === 1 ? `Remover ${nome} da reserva` : `Diminuir ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd - 1))}>
        {qtd === 1 ? <IconLixeira size={20} /> : <IconMenos size={20} />}
      </button>
      <output aria-live="polite">{qtd}</output>
      <button type="button" aria-label={`Aumentar ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd + 1))}>
        <IconMais size={20} />
      </button>
    </div>
  );
}
