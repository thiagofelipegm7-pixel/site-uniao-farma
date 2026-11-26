"use client";

import { useEffect, useState } from "react";
import { carregarVistos } from "../vistos-recentemente";

type Produto = { nome: string; slug: string };

export default function VistosRecentemente() {
  const [itens, setItens] = useState<Produto[]>([]);

  useEffect(() => {
    const slugs = carregarVistos();
    if (slugs.length === 0) return;
    // Busca nomes simples do catálogo de busca
    fetch("/dados/nacoes/catalogo-busca.json")
      .then((r) => r.json())
      .then((catalogo: { nome: string; slug: string }[]) => {
        const mapa = new Map(catalogo.map((p) => [p.slug, p.nome]));
        const lista = slugs
          .map((slug) => ({ slug, nome: mapa.get(slug) || slug }))
          .filter((p) => p.nome)
          .slice(0, 6);
        setItens(lista);
      })
      .catch(() => {});
  }, []);

  if (itens.length === 0) return null;

  return (
    <section style={{ padding: "1rem 1rem 0.5rem" }}>
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.5rem", fontWeight: 700 }}>Você viu recentemente</h2>
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {itens.map((p) => (
          <a
            key={p.slug}
            href={`/nacoes-unidas/produtos/${p.slug}`}
            style={{
              flex: "none",
              padding: "0.45rem 0.75rem",
              background: "#f4faf9",
              border: "1px solid #d3e2df",
              borderRadius: "8px",
              fontSize: "0.82rem",
              textDecoration: "none",
              color: "#1c3641",
              maxWidth: "150px",
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
