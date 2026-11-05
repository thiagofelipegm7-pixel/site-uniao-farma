"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { IconCesta } from "../reserva/ReservaIcons";
import { totalItens } from "../reserva/reserva-store";
import { useReserva } from "../reserva/useReserva";

/** Barra fixa "Ver minha cesta · N itens". Só aparece com itens; leva à página /reserva. */
export default function BarraReserva() {
  const total = totalItens(useReserva());
  if (total === 0) return null;
  return (
    <div className="barra-reserva">
      <a href="/reserva">
        <IconCesta size={26} />
        Ver minha cesta · {total} {total === 1 ? "item" : "itens"}
      </a>
    </div>
  );
}
