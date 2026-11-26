"use client";

import { useEffect, useState } from "react";
import { carregarUltimoPedido } from "../reserva/ultimo-pedido";
import "./novos-componentes.css";

export default function PrevisaoRecompra() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setMostrar(carregarUltimoPedido().length > 0);
  }, []);

  if (!mostrar) return null;

  return (
    <div className="uf-aviso" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
      <span>Você costuma comprar estes itens.</span>
      <a href="/reserva" className="uf-botao" style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}>
        Repetir
      </a>
    </div>
  );
}
