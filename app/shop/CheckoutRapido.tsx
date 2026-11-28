"use client";

import { useEffect, useState } from "react";
import { carregarDadosCliente } from "../reserva/dados-cliente";
import { carregarUltimoPedido } from "../reserva/ultimo-pedido";
import "./novos-componentes.css";

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
    <div className="uf-destaque" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
      <div>
        <strong style={{ display: "block", fontSize: "1rem" }}>Olá, {nome}!</strong>
        <small style={{ opacity: 0.9 }}>Dados do último pedido salvos · pague só na entrega ou retirada.</small>
      </div>
      <a href="/reserva" className="uf-botao" style={{ background: "#fff", color: "var(--color-teal-700, #006058)" }}>
        Repetir pedido
      </a>
    </div>
  );
}
