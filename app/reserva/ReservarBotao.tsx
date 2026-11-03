"use client";

import { trackEvent } from "../analytics";
import { IconLixeira, IconMais, IconMenos } from "./ReservaIcons";
import { adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem } from "./reserva-store";
import { useReserva } from "./useReserva";

type Props = {
  unitId: string;
  nome: string;
  precoCentavos: number;
  /** Preço de antes confirmado (centavos). */
  deCentavos?: number;
  foto?: string | null;
  /** Origem do clique. Só o id da origem, nunca o nome do produto. */
  source?: string;
  /** Cartão de produto do protótipo: só o "+" e, depois, o contador com "−" (sem texto). */
  compacto?: boolean;
};

/** Botão "+" que vira contador depois do primeiro toque (como no protótipo). Sem texto do produto no analytics. */
export default function ReservarBotao({ unitId, nome, precoCentavos, deCentavos, foto, source = "catalogo", compacto = false }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);

  if (qtd === 0) {
    return (
      <button
        type="button"
        className={compacto ? "reservar-mais reservar-mais-icone" : "reservar-mais"}
        aria-label={`Adicionar ${nome} à cesta`}
        onClick={() => {
          atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, deCentavos, foto }));
          trackEvent("reserva_add", { unit: unitId, source });
        }}
      >
        <IconMais size={22} />
        {compacto ? null : <span>Adicionar</span>}
      </button>
    );
  }

  return (
    <div className="reservar-contador" role="group" aria-label={`Quantidade de ${nome} na cesta`}>
      <button type="button" aria-label={qtd === 1 ? `Remover ${nome} da cesta` : `Diminuir ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd - 1))}>
        {qtd === 1 && !compacto ? <IconLixeira size={20} /> : <IconMenos size={20} />}
      </button>
      <output aria-live="polite">{qtd}</output>
      <button type="button" aria-label={`Aumentar ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd + 1))}>
        <IconMais size={20} />
      </button>
    </div>
  );
}
