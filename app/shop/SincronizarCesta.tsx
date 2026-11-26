"use client";

import { useState, useEffect } from "react";
import { gerarCodigo, codigoAtual, salvarCodigo } from "./carrinho-sync";
import { useReserva } from "../reserva/useReserva";

export default function SincronizarCesta() {
  const estado = useReserva();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [entrada, setEntrada] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setCodigo(codigoAtual());
  }, []);

  function criar() {
    const novo = gerarCodigo();
    salvarCodigo(novo);
    setCodigo(novo);
    // Em produção: enviar cesta para o servidor associada ao código
    setMsg("Código criado! Use em outro aparelho.");
  }

  function conectar() {
    if (entrada.length < 4) return;
    salvarCodigo(entrada.toUpperCase());
    setCodigo(entrada.toUpperCase());
    setMsg("Conectado! A cesta será sincronizada.");
    setEntrada("");
  }

  return (
    <div style={{ padding: "1rem", background: "#f9fdfc", borderRadius: "10px", margin: "1rem" }}>
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.5rem" }}>Sincronizar cesta</h2>
      <p style={{ fontSize: "0.85rem", color: "#3e4b49", margin: "0 0 0.75rem" }}>
        Continue sua compra em outro aparelho.
      </p>
      {codigo ? (
        <div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.1em", color: "#0e7370" }}>{codigo}</p>
          <small>Digite este código no outro aparelho</small>
        </div>
      ) : (
        <button type="button" onClick={criar} style={{ background: "#0e7370", color: "#fff", border: 0, borderRadius: "999px", padding: "0.5rem 1rem", fontWeight: 700 }}>
          Gerar código
        </button>
      )}
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Código de outro aparelho"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value.toUpperCase())}
          maxLength={8}
          style={{ flex: 1, padding: "0.4rem", border: "1px solid #d3e2df", borderRadius: "6px", textTransform: "uppercase" }}
        />
        <button type="button" onClick={conectar} style={{ background: "#fff", border: "1px solid #0e7370", color: "#0e7370", borderRadius: "6px", padding: "0.4rem 0.75rem", fontWeight: 700 }}>
          Conectar
        </button>
      </div>
      {msg && <p style={{ fontSize: "0.85rem", color: "#0e7370", marginTop: "0.5rem" }}>{msg}</p>}
    </div>
  );
}
