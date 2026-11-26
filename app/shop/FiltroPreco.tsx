"use client";

import { urlCatalogoSemMedicamentos } from "./catalogo-sem-medicamentos";

const faixas = [
  { label: "Até R$ 20", precoMaxReais: 20 },
  { label: "Até R$ 50", precoMaxReais: 50 },
  { label: "Até R$ 100", precoMaxReais: 100 },
];

export default function FiltroPreco() {
  return (
    <div
      className="uf-filtro-preco"
      style={{
        display: "flex",
        gap: "0.5rem",
        overflowX: "auto",
        padding: "0.5rem 1rem",
        scrollbarWidth: "none",
      }}
      aria-label="Filtrar por preço, sem medicamentos"
    >
      {faixas.map((f) => (
        <a
          key={f.precoMaxReais}
          href={urlCatalogoSemMedicamentos({ precoMaxReais: f.precoMaxReais })}
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            minHeight: "48px",
            padding: "0 1rem",
            background: "#f4faf9",
            border: "1px solid #d3e2df",
            borderRadius: "999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            textDecoration: "none",
            color: "#1c3641",
            whiteSpace: "nowrap",
          }}
        >
          {f.label}
        </a>
      ))}
    </div>
  );
}
