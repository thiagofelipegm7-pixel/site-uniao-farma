"use client";

import { useEffect, useState } from "react";
import { carregarUltimoPedido } from "../reserva/ultimo-pedido";

export default function PrevisaoRecompra() {
  const [sugestao, setSugestao] = useState<string | null>(null);

  useEffect(() => {
    const ultimo = carregarUltimoPedido();
    if (ultimo.length === 0) return;
    // Simples: se tem pedido anterior, sugere recompra
    const dias = 30;
    setSugestao(`Você costuma comprar estes itens. Quer repetir?`);
  }, []);

  if (!sugestao) return null;

  return (
    <div style={{ margin: "1rem", padding: "0.75rem 1rem", background: "#fff8e1", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
      <span style={{ fontSize: "0.9rem" }}>{sugestao}</span>
      <a href="/reserva" style={{ background: "#0e7370", color: "#fff", padding: "0.4rem 0.8rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
        Repetir
      </a>
    </div>
  );
}
