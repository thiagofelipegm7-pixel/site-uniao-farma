"use client";

export default function ModoEconomia() {
  return (
    <a
      href="/nacoes-unidas/produtos?ordem=preco"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        background: "#e8f5e9",
        borderRadius: "10px",
        margin: "1rem",
        textDecoration: "none",
        color: "#2e7d32",
        fontWeight: 700,
      }}
    >
      <span>💰</span>
      <span>Modo economia — ver mais baratos primeiro</span>
    </a>
  );
}
