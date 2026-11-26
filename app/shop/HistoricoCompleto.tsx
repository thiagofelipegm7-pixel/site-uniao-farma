"use client";

import { useEffect, useState } from "react";

type Pedido = { id: number; itens: string; total: string; criado_em: string };

export default function HistoricoCompleto() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/pedidos")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setPedidos(data.itens || []);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p style={{ padding: "2rem", textAlign: "center" }}>Carregando...</p>;

  if (pedidos.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Nenhum pedido anterior encontrado.</p>
        <a href="/reserva" style={{ color: "#0e7370" }}>Fazer um pedido</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Meus pedidos</h1>
      {pedidos.map((p) => {
        let itens: { nome: string; qtd: number }[] = [];
        try { itens = JSON.parse(p.itens); } catch {}
        const data = new Date(p.criado_em).toLocaleDateString("pt-BR");
        return (
          <div key={p.id} style={{ border: "1px solid #d3e2df", borderRadius: "10px", padding: "1rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <strong>{data}</strong>
              <span style={{ color: "#0e7370", fontWeight: 700 }}>{p.total}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
              {itens.slice(0, 4).map((item, i) => (
                <li key={i}>{item.qtd}× {item.nome}</li>
              ))}
              {itens.length > 4 && <li style={{ color: "#666" }}>+ {itens.length - 4} itens</li>}
            </ul>
            <a
              href="/reserva"
              style={{ background: "#0e7370", color: "#fff", padding: "0.4rem 0.9rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}
            >
              Repetir
            </a>
          </div>
        );
      })}
    </div>
  );
}
