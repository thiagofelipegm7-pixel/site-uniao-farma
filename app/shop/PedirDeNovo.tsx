"use client";

import { useEffect, useState } from "react";
import { carregarUltimoPedido } from "../reserva/ultimo-pedido";

export default function PedirDeNovo() {
  const [temPedido, setTemPedido] = useState(false);

  useEffect(() => {
    setTemPedido(carregarUltimoPedido().length > 0);
  }, []);

  if (!temPedido) return null;

  return (
    <div style={{
      margin: "1rem 1rem 0",
      padding: "0.875rem 1rem",
      background: "#e8f7f5",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
    }}>
      <div>
        <strong style={{ display: "block", fontSize: "0.95rem" }}>Pedir de novo</strong>
        <small style={{ color: "#3e4b49" }}>Repita seu último pedido em 1 toque</small>
      </div>
      <a
        href="/reserva"
        style={{
          background: "#0e7370",
          color: "#fff",
          padding: "0.5rem 1rem",
          borderRadius: "999px",
          fontWeight: 700,
          fontSize: "0.875rem",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Repetir
      </a>
    </div>
  );
}
