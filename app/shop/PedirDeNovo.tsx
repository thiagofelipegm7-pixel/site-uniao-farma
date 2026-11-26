"use client";

import { useEffect, useState } from "react";
import { carregarUltimoPedido } from "../reserva/ultimo-pedido";

/**
 * Atalho "Pedir de novo", visível só quando este aparelho já enviou um pedido.
 * Fica fora da grade do cabeçalho: dentro dela, no Firefox o cartão caía na coluna
 * do menu (2,75 rem) e o botão "Repetir" saía da caixa.
 */
export default function PedirDeNovo() {
  const [temPedido, setTemPedido] = useState(false);

  useEffect(() => {
    setTemPedido(carregarUltimoPedido().length > 0);
  }, []);

  if (!temPedido) return null;

  return (
    <div className="pedir-de-novo">
      <div className="pedir-de-novo-texto">
        <strong>Pedir de novo</strong>
        <small>Repita seu último pedido em 1 toque</small>
      </div>
      <a className="pedir-de-novo-botao" href="/reserva">
        Repetir
      </a>
    </div>
  );
}
