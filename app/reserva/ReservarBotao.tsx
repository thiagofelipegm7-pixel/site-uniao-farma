"use client";

import { useRef } from "react";
import { trackEvent } from "../analytics";
import { registrarEtapa } from "../funil";
import { IconLixeira, IconMais, IconMaisFino, IconMenos, IconCesta } from "./ReservaIcons";
import { abrirReserva } from "./abrir-reserva";
import { adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem, tetoDoItem } from "./reserva-store";
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
  /** Medicamento com receita ou controlado: a cesta marca o item e só deixa retirar na loja. */
  receita?: "receita" | "controlado";
  /** "cesta": botão redondo com sacola e "+" no canto do cartão. "cartao": círculo com + no canto da foto; a quantidade se ajusta na cesta. */
  variante?: "cesta" | "cartao";
  /** Página do produto: a cesta confere a disponibilidade ao vivo por ela. */
  slug?: string;
  /** Texto do botão grande (padrão "Adicionar"). */
  rotulo?: string;
  /** Unidades que restam na loja (1 a 5): a cesta não passa disso. */
  max?: number;
};

/** Botão "+" que adiciona à cesta. No card, o círculo permanece e a quantidade se ajusta no modal. Sem texto do produto no analytics. */
export default function ReservarBotao({ unitId, nome, precoCentavos, deCentavos, foto, source = "catalogo", compacto = false, receita, variante, rotulo = "Adicionar", max, slug }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);
  const teto = tetoDoItem({ max });
  const maisRef = useRef<HTMLButtonElement>(null);

  const acrescentar = (opcoes?: { abrirCesta?: boolean; gatilho?: HTMLElement | null }) => {
    // Preço 0 (ou inválido) não entra na cesta: não dispara analytics nem abre o modal.
    if (!(precoCentavos > 0)) return;
    atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, deCentavos, foto, ...(receita ? { receita } : {}), ...(max ? { max } : {}), ...(slug ? { slug } : {}) }));
    trackEvent("reserva_add", { unit: unitId, source });
    registrarEtapa("add");
    if (opcoes?.abrirCesta) abrirReserva(opcoes.gatilho);
  };

  // Card (catálogo, listas, carrosséis): o círculo + permanece; cada clique adiciona 1 e abre a cesta.
  if (variante === "cartao") {
    return (
      <button
        ref={maisRef}
        type="button"
        className="pv-adicionar"
        aria-label={`Adicionar ${nome} à cesta`}
        onClick={() => acrescentar({ abrirCesta: true, gatilho: maisRef.current })}
      >
        <IconMaisFino size={28} strokeWidth={2} />
      </button>
    );
  }

  if (qtd === 0) {
    return (
      <button
        type="button"
        className={variante === "cesta" ? "reservar-mais pv-cesta-botao" : compacto ? "reservar-mais reservar-mais-icone" : "reservar-mais"}
        aria-label={`Adicionar ${nome} à cesta`}
        onClick={() => acrescentar()}
      >
        {variante === "cesta" ? (
          <>
            <IconCesta size={26} />
            <span className="pv-cesta-mais" aria-hidden="true"><IconMais size={12} /></span>
          </>
        ) : (
          <>
            <IconMais size={22} />
            {compacto ? null : <span>{rotulo}</span>}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="reservar-contador" role="group" aria-label={`Quantidade de ${nome} na cesta`}>
      <button type="button" aria-label={qtd === 1 ? `Remover ${nome} da cesta` : `Diminuir ${nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd - 1))}>
        {qtd === 1 && !compacto ? <IconLixeira size={20} /> : <IconMenos size={20} />}
      </button>
      <output aria-live="polite">{qtd}</output>
      <button type="button" aria-label={`Aumentar ${nome}`} disabled={qtd >= teto} title={max && qtd >= max ? `Só restam ${max}` : undefined} onClick={() => atualizarReserva((s) => definirQtd(s, id, qtd + 1))}>
        <IconMais size={20} />
      </button>
    </div>
  );
}
