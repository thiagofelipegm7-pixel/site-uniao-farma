"use client";

import { useEffect, useState } from "react";
import PreVendasPainel from "./PreVendasPainel";
import PainelPedidos from "./PainelPedidos";
import PainelRecompra from "./PainelRecompra";
import "./vendas-direcao.css";

type Aba = "pre-vendas" | "pedidos" | "recompra";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "pre-vendas", rotulo: "Pré-vendas" },
  { id: "pedidos", rotulo: "Pedidos" },
  { id: "recompra", rotulo: "Recompra" },
];

function abaDaUrl(): Aba {
  const a = new URLSearchParams(window.location.search).get("aba");
  return a === "pedidos" || a === "recompra" ? a : "pre-vendas";
}

/** Tudo de venda numa página só: pré-vendas, pedidos do site e lembretes de recompra. A aba fica na URL (?aba=pedidos ou ?aba=recompra). */
export default function VendasAbas() {
  const [aba, setAba] = useState<Aba>("pre-vendas");

  useEffect(() => {
    const ler = () => setAba(abaDaUrl());
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);

  function escolher(id: Aba) {
    setAba(id);
    const url = new URL(window.location.href);
    if (id === "pre-vendas") url.searchParams.delete("aba");
    else url.searchParams.set("aba", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="vendas-abas">
      <header className="vendas-abas-topo">
        <h1>Vendas</h1>
        <div role="tablist" aria-label="Tipo de venda" className="vendas-abas-lista">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={aba === a.id}
              aria-controls={`painel-${a.id}`}
              className={aba === a.id ? "vendas-aba is-ativa" : "vendas-aba"}
              onClick={() => escolher(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </header>
      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {aba === "pre-vendas" ? <PreVendasPainel nivel={2} /> : aba === "pedidos" ? <PainelPedidos nivel={2} /> : <PainelRecompra nivel={2} />}
      </div>
    </div>
  );
}
