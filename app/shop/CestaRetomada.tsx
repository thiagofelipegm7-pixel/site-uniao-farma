"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { formatarCentavos, itemAtivo, subtotalCentavos } from "../reserva/reserva-store";
import { useReserva } from "../reserva/useReserva";

/**
 * Cartão da home para quem deixou itens na cesta: mostra quantos e o subtotal e leva direto ao pedido.
 * Lê só a cesta que já está no navegador; sem itens, não aparece (e não há diferença de hidratação, pois o servidor vê a cesta vazia).
 */
export default function CestaRetomada() {
  const estado = useReserva();
  const ativos = estado.itens.filter(itemAtivo);
  if (ativos.length === 0) return null;
  const unidades = ativos.reduce((soma, i) => soma + i.qtd, 0);
  const subtotal = subtotalCentavos(estado.itens);
  return (
    <section className="cesta-retomada" aria-label="Sua cesta">
      <p>
        <strong>Você deixou {unidades} {unidades === 1 ? "item" : "itens"} na cesta</strong>
        {subtotal > 0 ? <span> · {formatarCentavos(subtotal)}</span> : null}
        <span> · pague só na entrega ou retirada</span>
      </p>
      <a className="cesta-retomada-botao" href="/reserva" data-track-event="cta_click" data-track-source="home_cesta_retomada">Concluir pedido</a>
    </section>
  );
}
