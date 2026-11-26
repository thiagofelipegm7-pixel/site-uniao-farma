"use client";

import { useState } from "react";
import { carregarListas, salvarListas, type ListaCompra } from "./listas-compras";

export default function SalvarNaLista({ nome, slug }: { nome: string; slug?: string }) {
  const [aberto, setAberto] = useState(false);
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [salvo, setSalvo] = useState(false);

  function abrir() {
    setListas(carregarListas());
    setAberto(true);
  }

  function salvar(listaId: string) {
    const atualizadas = listas.map((l) => {
      if (l.id !== listaId) return l;
      const existe = l.itens.find((i) => i.nome === nome);
      if (existe) {
        return { ...l, itens: l.itens.map((i) => i.nome === nome ? { ...i, qtd: i.qtd + 1 } : i) };
      }
      return { ...l, itens: [...l.itens, { nome, qtd: 1, slug }] };
    });
    salvarListas(atualizadas);
    setSalvo(true);
    setTimeout(() => { setAberto(false); setSalvo(false); }, 1200);
  }

  if (salvo) {
    return <span style={{ fontSize: "0.75rem", color: "#0e7370", fontWeight: 700 }}>Salvo!</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Salvar ${nome} na lista`}
        style={{
          background: "transparent",
          border: "1px solid #d3e2df",
          borderRadius: "6px",
          padding: "0.25rem 0.5rem",
          fontSize: "0.7rem",
          color: "#3e4b49",
          cursor: "pointer",
        }}
      >
        + Lista
      </button>
      {aberto && (
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            background: "#fff",
            border: "1px solid #d3e2df",
            borderRadius: "8px",
            padding: "0.5rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            minWidth: "160px",
          }}
        >
          {listas.length === 0 ? (
            <p style={{ fontSize: "0.8rem", margin: 0 }}>
              <a href="/listas" style={{ color: "#0e7370" }}>Crie uma lista</a>
            </p>
          ) : (
            listas.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => salvar(l.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  padding: "0.4rem 0.5rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {l.nome}
              </button>
            ))
          )}
          <button type="button" onClick={() => setAberto(false)} style={{ fontSize: "0.75rem", color: "#666", background: "transparent", border: 0, marginTop: "0.25rem" }}>
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
