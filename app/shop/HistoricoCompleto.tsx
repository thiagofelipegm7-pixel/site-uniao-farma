"use client";

import { useEffect, useState } from "react";

type Pedido = { id: string; data: string; itens: { nome: string; qtd: number }[]; total: string };

export default function HistoricoCompleto() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("uf_historico_pedidos_v1");
      if (raw) setPedidos(JSON.parse(raw));
    } catch {}
  }, []);

  if (pedidos.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Nenhum pedido anterior encontrado neste aparelho.</p>
        <a href="/reserva" style={{ color: "#0e7370" }}>Fazer um pedido</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Meus pedidos</h1>
      {pedidos.map((p) => (
        <div key={p.id} style={{ border: "1px solid #d3e2df", borderRadius: "10px", padding: "1rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <strong>{p.data}</strong>
            <span style={{ color: "#0e7370", fontWeight: 700 }}>{p.total}</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
            {p.itens.slice(0, 4).map((item, i) => (
              <li key={i}>{item.qtd}× {item.nome}</li>
            ))}
            {p.itens.length > 4 && <li style={{ color: "#666" }}>+ {p.itens.length - 4} itens</li>}
          </ul>
          <a
            href="/reserva"
            style={{ background: "#0e7370", color: "#fff", padding: "0.4rem 0.9rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}
          >
            Repetir
          </a>
        </div>
      ))}
    </div>
  );
}
