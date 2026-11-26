"use client";

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
    <div style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>O que você está sentindo?</h2>
      <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.75rem" }}>
        Sugestões gerais. Consulte o farmacêutico.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {sintomas.map((s) => (
          <a
            key={s.nome}
            href={`/nacoes-unidas/produtos?q=${encodeURIComponent(s.busca)}`}
            style={{
              padding: "0.5rem 0.85rem",
              background: "#e8f7f5",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              color: "#0e7370",
            }}
          >
            {s.nome}
          </a>
        ))}
      </div>
    </div>
  );
}
