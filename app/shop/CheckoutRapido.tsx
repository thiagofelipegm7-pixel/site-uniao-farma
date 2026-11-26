"use client";

import { useEffect, useState } from "react";
import { carregarDadosCliente } from "../reserva/dados-cliente";
import { carregarUltimoPedido } from "../reserva/ultimo-pedido";

export default function CheckoutRapido() {
  const [pronto, setPronto] = useState(false);
  const [nome, setNome] = useState("");

  useEffect(() => {
    const dados = carregarDadosCliente();
    const ultimo = carregarUltimoPedido();
    if (dados && ultimo.length > 0) {
      setPronto(true);
      setNome(dados.nome.split(" ")[0]);
    }
  }, []);

  if (!pronto) return null;

  return (
    <div style={{
      margin: "0.75rem 1rem",
      padding: "1rem",
      background: "linear-gradient(135deg, #0e7370, #0a5c59)",
      color: "#fff",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
    }}>
      <div>
        <strong style={{ display: "block" }}>Olá, {nome}!</strong>
        <small style={{ opacity: 0.9 }}>Seus dados estão salvos. Peça de novo em 1 toque.</small>
      </div>
      <a
        href="/reserva"
        style={{
          background: "#fff",
          color: "#0e7370",
          padding: "0.5rem 1rem",
          borderRadius: "999px",
          fontWeight: 700,
          fontSize: "0.875rem",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Pedir agora
      </a>
    </div>
  );
}
