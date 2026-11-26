"use client";

import "./novos-componentes.css";

/** Só termos de higiene, bebê e cuidado diário — nenhum princípio ativo. */
const kits = [
  { nome: "Kit Bebê", itens: "fralda,lenço umedecido", emoji: "👶" },
  { nome: "Kit Higiene", itens: "sabonete,shampoo,creme dental", emoji: "🧴" },
  { nome: "Kit Cuidado diário", itens: "desodorante,protetor solar", emoji: "☀️" },
  { nome: "Kit Casa", itens: "papel higiênico,álcool em gel", emoji: "🏠" },
];

export default function SugestaoKit() {
  return (
    <section className="uf-card" aria-labelledby="uf-kits-titulo">
      <h2 className="uf-card-titulo" id="uf-kits-titulo">Kits prontos</h2>
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
            <span style={{ fontSize: "1.5rem" }} aria-hidden="true">{k.emoji}</span>
            <strong style={{ display: "block", fontSize: "0.85rem", marginTop: "0.25rem" }}>{k.nome}</strong>
          </a>
        ))}
      </div>
    </section>
  );
}
