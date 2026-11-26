"use client";

const faixas = [
  { label: "Até R$ 20", ate: 2000 },
  { label: "Até R$ 50", ate: 5000 },
  { label: "Até R$ 100", ate: 10000 },
];

export default function FiltroPreco() {
  return (
    <div style={{
      display: "flex",
      gap: "0.5rem",
      overflowX: "auto",
      padding: "0.5rem 1rem",
      scrollbarWidth: "none",
    }}>
      {faixas.map((f) => (
        <a
          key={f.ate}
          href={`/nacoes-unidas/produtos?ate=${f.ate}`}
          style={{
            flex: "none",
            padding: "0.4rem 0.85rem",
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
