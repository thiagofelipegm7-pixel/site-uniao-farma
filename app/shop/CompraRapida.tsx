"use client";

import { useEffect, useState } from "react";
import ReservarBotao from "../reserva/ReservarBotao";

type Produto = { nome: string; slug: string; precoCentavos: number; foto: string | null };

export default function CompraRapida() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    fetch("/dados/nacoes/catalogo-busca.json")
      .then((r) => r.json())
      .then((data: Produto[]) => setProdutos(data.slice(0, 80)))
      .catch(() => {});
  }, []);

  const lista = produtos.filter((p) =>
    p.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Compra rápida</h1>
      <p style={{ color: "#3e4b49", marginBottom: "1rem", fontSize: "0.9rem" }}>
        Lista simples para quem já sabe o que quer.
      </p>
      <input
        type="search"
        placeholder="Filtrar produtos..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "1px solid #d3e2df",
          borderRadius: "8px",
          marginBottom: "1rem",
          fontSize: "1rem",
        }}
      />
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {lista.map((p) => (
          <li
            key={p.slug}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: "0.75rem 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>{p.nome}</strong>
              <span style={{ color: "#0e7370", fontWeight: 700 }}>
                {(p.precoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <ReservarBotao
              unitId="nacoes-unidas"
              nome={p.nome}
              precoCentavos={p.precoCentavos}
              foto={p.foto}
              slug={p.slug}
              source="compra-rapida"
              compacto
            />
          </li>
        ))}
      </ul>
      {lista.length === 0 && filtro && (
        <p style={{ textAlign: "center", color: "#666", marginTop: "2rem" }}>
          Nenhum produto encontrado.
        </p>
      )}
    </div>
  );
}
