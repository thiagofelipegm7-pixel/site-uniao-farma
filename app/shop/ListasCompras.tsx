"use client";

import { useEffect, useState } from "react";
import { carregarListas, salvarListas, criarLista, type ListaCompra, type ItemLista } from "./listas-compras";
import { adicionar, atualizarReserva } from "../reserva/reserva-store";

export default function ListasCompras() {
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [nova, setNova] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  useEffect(() => {
    setListas(carregarListas());
  }, []);

  function atualizar(novas: ListaCompra[]) {
    setListas(novas);
    salvarListas(novas);
  }

  function adicionarLista() {
    if (!nova.trim()) return;
    atualizar([...listas, criarLista(nova)]);
    setNova("");
  }

  function adicionarNaCesta(lista: ListaCompra) {
    atualizarReserva((estado) => {
      let novo = estado;
      for (const item of lista.itens) {
        novo = adicionar(novo, {
          unitId: "nacoes-unidas",
          nome: item.nome,
          precoCentavos: 0,
          slug: item.slug,
        });
      }
      return novo;
    });
    alert(`${lista.itens.length} itens adicionados à cesta!`);
  }

  return (
    <div style={{ padding: "1rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Minhas listas</h1>
      <p style={{ color: "#3e4b49", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Crie listas e adicione tudo à cesta de uma vez.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Nome da lista (ex.: Casa, Bebê)"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionarLista()}
          style={{ flex: 1, padding: "0.6rem", border: "1px solid #d3e2df", borderRadius: "8px" }}
        />
        <button
          type="button"
          onClick={adicionarLista}
          style={{ background: "#0e7370", color: "#fff", border: 0, borderRadius: "8px", padding: "0.6rem 1rem", fontWeight: 700 }}
        >
          Criar
        </button>
      </div>

      {listas.length === 0 && (
        <p style={{ textAlign: "center", color: "#666" }}>Nenhuma lista ainda.</p>
      )}

      {listas.map((lista) => (
        <div key={lista.id} style={{ border: "1px solid #d3e2df", borderRadius: "10px", marginBottom: "0.75rem", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setAberta(aberta === lista.id ? null : lista.id)}
            style={{ width: "100%", textAlign: "left", padding: "0.75rem 1rem", background: "#f9fdfc", border: 0, fontWeight: 700, cursor: "pointer" }}
          >
            {lista.nome} <small style={{ fontWeight: 400, color: "#666" }}>({lista.itens.length} itens)</small>
          </button>
          {aberta === lista.id && (
            <div style={{ padding: "0.75rem 1rem" }}>
              {lista.itens.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.85rem" }}>Lista vazia. Adicione produtos da busca ou do catálogo.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem" }}>
                  {lista.itens.map((item, i) => (
                    <li key={i} style={{ padding: "0.3rem 0", fontSize: "0.9rem" }}>
                      {item.qtd}× {item.nome}
                    </li>
                  ))}
                </ul>
              )}
              {lista.itens.length > 0 && (
                <button
                  type="button"
                  onClick={() => adicionarNaCesta(lista)}
                  style={{ background: "#0e7370", color: "#fff", border: 0, borderRadius: "999px", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  Adicionar tudo à cesta
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
