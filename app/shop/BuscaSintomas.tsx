"use client";

import "./novos-componentes.css";

const sintomas = [
  { nome: "Dor de cabeça", busca: "dipirona paracetamol" },
  { nome: "Febre", busca: "paracetamol dipirona" },
  { nome: "Dor de garganta", busca: "spray garganta" },
  { nome: "Azia", busca: "antiácido" },
  { nome: "Alergia", busca: "antialérgico" },
  { nome: "Tosse", busca: "xarope tosse" },
];

export default function BuscaSintomas() {
  return (
    <section className="uf-card">
      <h2 className="uf-card-titulo">O que você está sentindo?</h2>
      <p className="uf-card-texto">Sugestões gerais. Consulte o farmacêutico.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {sintomas.map((s) => (
          <a key={s.nome} href={`/nacoes-unidas/produtos?q=${encodeURIComponent(s.busca)}`} className="uf-chip">
            {s.nome}
          </a>
        ))}
      </div>
    </section>
  );
}
