"use client";

import { useEffect, useState } from "react";
import { carregarUltimoPedido, type ItemUltimoPedido } from "../reserva/ultimo-pedido";

export default function HistoricoPedidos() {
  const [itens, setItens] = useState<ItemUltimoPedido[]>([]);

  useEffect(() => {
    setItens(carregarUltimoPedido());
  }, []);

  if (itens.length === 0) return null;

  return (
    <section style={{ padding: "1rem", background: "#f9fdfc", borderRadius: "10px", margin: "1rem" }}>
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.5rem" }}>Seu último pedido</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
        {itens.slice(0, 5).map((item, i) => (
          <li key={i} style={{ padding: "0.3rem 0", borderBottom: "1px solid #eee" }}>
            {item.qtd}× {item.nome}
          </li>
        ))}
        {itens.length > 5 && <li style={{ padding: "0.3rem 0", color: "#666" }}>+ {itens.length - 5} itens</li>}
      </ul>
      <a
        href="/reserva"
        style={{
          display: "inline-block",
          marginTop: "0.75rem",
          background: "#0e7370",
          color: "#fff",
          padding: "0.4rem 0.9rem",
          borderRadius: "999px",
          fontSize: "0.85rem",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Repetir pedido
      </a>
    </section>
  );
}
