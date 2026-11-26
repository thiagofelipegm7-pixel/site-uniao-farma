"use client";

import "./novos-componentes.css";

const kits = [
  { nome: "Kit Resfriado", itens: "dipirona,vitamina c,spray", emoji: "🤧" },
  { nome: "Kit Bebê", itens: "fralda,lenço,pomada", emoji: "👶" },
  { nome: "Kit Higiene", itens: "sabonete,shampoo,creme", emoji: "🧴" },
  { nome: "Kit Primeiros Socorros", itens: "band-aid,álcool,gaze", emoji: "🩹" },
];

export default function SugestaoKit() {
  return (
    <section className="uf-card">
      <h2 className="uf-card-titulo">Kits prontos</h2>
      <div className="uf-grid-2">
        {kits.map((k) => (
          <a
            key={k.nome}
            href={`/nacoes-unidas/produtos?q=${encodeURIComponent(k.itens)}`}
            style={{
              padding: "0.85rem",
              background: "var(--color-neutral-100, #f1f3f2)",
              borderRadius: "10px",
              textDecoration: "none",
              color: "var(--color-ink, #000)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{k.emoji}</span>
            <strong style={{ display: "block", fontSize: "0.85rem", marginTop: "0.25rem" }}>{k.nome}</strong>
          </a>
        ))}
      </div>
    </section>
  );
}
