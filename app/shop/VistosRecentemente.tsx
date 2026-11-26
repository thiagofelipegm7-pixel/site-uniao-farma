"use client";

import { useEffect, useState } from "react";

type Visto = { nome: string; slug: string };

export default function VistosRecentemente() {
  const [itens, setItens] = useState<Visto[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("uf_vistos_v1");
      if (raw) setItens(JSON.parse(raw).slice(0, 4));
    } catch {}
  }, []);

  if (itens.length === 0) return null;

  return (
    <section style={{ padding: "1rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Você viu recentemente</h2>
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
        {itens.map((p) => (
          <a
            key={p.slug}
            href={`/nacoes-unidas/produtos/${p.slug}`}
            style={{
              flex: "none",
              padding: "0.5rem 0.75rem",
              background: "#f4faf9",
              borderRadius: "8px",
              fontSize: "0.85rem",
              textDecoration: "none",
              color: "#000",
              maxWidth: "140px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.nome}
          </a>
        ))}
      </div>
    </section>
  );
}
