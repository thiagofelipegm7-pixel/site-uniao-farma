"use client";

import "./novos-componentes.css";

export default function ModoEconomia() {
  return (
    <a href="/nacoes-unidas/produtos?ordem=preco" className="uf-card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "inherit" }}>
      <span style={{ fontSize: "1.5rem" }}>💰</span>
      <div>
        <strong className="uf-card-titulo" style={{ margin: 0 }}>Modo economia</strong>
        <p className="uf-card-texto" style={{ margin: 0 }}>Ver os mais baratos primeiro</p>
      </div>
    </a>
  );
}
