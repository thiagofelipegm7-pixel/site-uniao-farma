"use client";

import { useState } from "react";

export default function AviseMe({ produto }: { produto: string }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (enviado) {
    return <p style={{ fontSize: "0.85rem", color: "#0e7370", margin: "0.5rem 0" }}>Avisaremos quando chegar!</p>;
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
          await fetch("/api/avise-me", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ produto, email }),
          });
        } catch {}
        // Também salva localmente como backup
        try {
          const lista = JSON.parse(localStorage.getItem("uf_avise_v1") || "[]");
          lista.push({ produto, email, quando: Date.now() });
          localStorage.setItem("uf_avise_v1", JSON.stringify(lista));
        } catch {}
        setEnviado(true);
        setEnviando(false);
      }}
      style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}
    >
      <input
        type="email"
        required
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={enviando}
        style={{ flex: 1, minWidth: "140px", padding: "0.4rem 0.6rem", border: "1px solid #d3e2df", borderRadius: "6px", fontSize: "0.85rem" }}
      />
      <button
        type="submit"
        disabled={enviando}
        style={{ background: "#0e7370", color: "#fff", border: 0, borderRadius: "6px", padding: "0.4rem 0.75rem", fontWeight: 700, fontSize: "0.8rem" }}
      >
        {enviando ? "..." : "Avise-me"}
      </button>
    </form>
  );
}
