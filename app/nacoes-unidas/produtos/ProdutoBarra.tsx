"use client";

import { trackEvent } from "../../analytics";
import { registrarEtapa } from "../../funil";
import { abrirReserva } from "../../reserva/abrir-reserva";
import { IconLixeira, IconMais, IconMenos } from "../../reserva/ReservaIcons";
import { formatarCentavos, adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem, tetoDoItem } from "../../reserva/reserva-store";
import { useReserva } from "../../reserva/useReserva";
import { useDisponibilidade } from "../../reserva/useDisponibilidade";

type Props = {
  unitId: string;
  nome: string;
  precoCentavos: number;
  foto?: string | null;
  /** Unidades que restam na loja (1 a 5): a cesta não passa disso. */
  max?: number;
  /** Página do produto: confere a disponibilidade ao vivo. */
  slug?: string;
};

/** Barra fixa da página do produto. O nome fica na tela, não no analytics. */
export default function ProdutoBarra({ unitId, nome, precoCentavos, foto, max: maxPublicado, slug }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);
  // Estoque de agora: se acabou depois da última publicação, não deixa adicionar; se restam poucos, limita a quantidade.
  const vivo = useDisponibilidade(true);
  const nivel = slug && vivo ? vivo[slug] : undefined;
  const acabou = nivel === 0;
  const max = nivel !== undefined && nivel >= 1 && nivel <= 5 ? nivel : maxPublicado;

  if (qtd === 0 && acabou) {
    return (
      <div className="produto-barra">
        <button type="button" className="produto-adicionar" disabled>
          Acabou agora na loja
        </button>
      </div>
    );
  }

  if (qtd === 0) {
    return (
      <div className="produto-barra">
        <p className="produto-barra-preco"><small>Preço</small><strong>{formatarCentavos(precoCentavos)}</strong></p>
        <button
          type="button"
          className="produto-adicionar"
          onClick={() => {
            atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, foto, ...(max ? { max } : {}), ...(slug ? { slug } : {}) }));
            trackEvent("reserva_add", { unit: unitId, source: "produto_nacoes" });
            registrarEtapa("add");
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
        <button type="button" aria-label={`Aumentar ${nome}`} disabled={qtd >= tetoDoItem({ max })} title={max && qtd >= max ? `Só restam ${max}` : undefined} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd + 1))}>
          <IconMais size={20} />
        </button>
      </div>
      <button type="button" className="produto-ver-reserva" onClick={() => abrirReserva()}>
        Ver cesta
      </button>
    </div>
  );
}
