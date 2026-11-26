"use client";

import { useState } from "react";

export default function AviseMe({ produto }: { produto: string }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  if (enviado) {
    return <p style={{ fontSize: "0.85rem", color: "#0e7370" }}>Avisaremos quando chegar!</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Salva localmente por enquanto
        const lista = JSON.parse(localStorage.getItem("uf_avise_v1") || "[]");
        lista.push({ produto, email, quando: Date.now() });
        localStorage.setItem("uf_avise_v1", JSON.stringify(lista));
        setEnviado(true);
      }}
      style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
    >
      <input
        type="email"
        required
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid #d3e2df", borderRadius: "6px", fontSize: "0.85rem" }}
      />
      <button type="submit" style={{ background: "#0e7370", color: "#fff", border: 0, borderRadius: "6px", padding: "0.4rem 0.75rem", fontWeight: 700, fontSize: "0.8rem" }}>
        Avise-me
      </button>
    </form>
  );
}
