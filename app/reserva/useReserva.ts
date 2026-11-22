"use client";

import { useEffect, useSyncExternalStore } from "react";
import { assinarReserva, lerReserva, lerReservaServidor, sincronizarPromocoes, atualizarReserva, type ReservaEstado } from "./reserva-store";
import { carregarPromocoesQuantidade } from "../promocao-quantidade-cliente";

let sincronizacaoIniciada = false;

/** Estado da reserva. No servidor e na primeira pintura vem vazio, então não há diferença de hidratação. */
export function useReserva(): ReservaEstado {
  const estado = useSyncExternalStore(assinarReserva, lerReserva, lerReservaServidor);
  useEffect(() => {
    if (sincronizacaoIniciada) return;
    sincronizacaoIniciada = true;
    void carregarPromocoesQuantidade().then((promocoes) => {
      atualizarReserva((atual) => sincronizarPromocoes(atual, promocoes));
    }).catch(() => { sincronizacaoIniciada = false; });
  }, []);
  return estado;
}
