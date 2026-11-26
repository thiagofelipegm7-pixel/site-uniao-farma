"use client";

const kits = [
  { nome: "Kit Resfriado", itens: "dipirona,vitamina c,spray", emoji: "🤧" },
  { nome: "Kit Bebê", itens: "fralda,lenço,pomada", emoji: "👶" },
  { nome: "Kit Higiene", itens: "sabonete,shampoo,creme", emoji: "🧴" },
  { nome: "Kit Primeiros Socorros", itens: "band-aid,álcool,gaze", emoji: "🩹" },
];

export default function SugestaoKit() {
  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Kits prontos</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {kits.map((k) => (
          <a
            key={k.nome}
            href={`/nacoes-unidas/produtos?q=${encodeURIComponent(k.itens)}`}
            style={{
              padding: "0.75rem",
              background: "#f9fdfc",
              border: "1px solid #d3e2df",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#1c3641",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{k.emoji}</span>
            <strong style={{ display: "block", fontSize: "0.85rem", marginTop: "0.25rem" }}>{k.nome}</strong>
          </a>
        ))}
      </div>
    </div>
  );
}
