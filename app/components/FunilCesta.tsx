"use client";

import { useEffect, useState } from "react";
import type { LinhaFunil } from "../funil";

type Resposta = { ok: boolean; sete: LinhaFunil[]; trinta: LinhaFunil[] };

function Tabela({ titulo, linhas }: { titulo: string; linhas: LinhaFunil[] }) {
  const topo = linhas[0]?.total ?? 0;
  return (
    <div>
      <h3>{titulo}</h3>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
        {linhas.map((l) => (
          <li key={l.etapa}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.9375rem" }}>
              <span>{l.rotulo}</span>
              <strong>{l.total}{l.doAnterior !== null ? ` · ${l.doAnterior}% da etapa anterior` : ""}</strong>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "#e3ecea" }} aria-hidden="true">
              <div style={{ height: 8, borderRadius: 4, background: "#31a89d", width: `${topo > 0 ? Math.max(2, Math.round((l.total / topo) * 100)) : 0}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Onde os clientes desistem: quantas visitas chegam a cada etapa da cesta. */
export default function FunilCesta() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    fetch("/api/interno/funil", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Resposta) => (j.ok ? setDados(j) : setErro(true)))
      .catch(() => setErro(true));
  }, []);
  return (
    <section aria-label="Funil da cesta" style={{ margin: "1.5rem 0" }}>
      <h2>Funil da cesta</h2>
      <p>Cada linha conta visitas (uma vez por visita) que chegaram àquela etapa. Quanto maior a queda entre duas linhas, mais gente desiste ali. Não guarda nome, produto nem endereço.</p>
      {erro ? <p role="alert">Ainda sem dados do funil neste ambiente.</p> : null}
      {!dados && !erro ? <p>Carregando…</p> : null}
      {dados ? (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))" }}>
          <Tabela titulo="Últimos 7 dias" linhas={dados.sete} />
          <Tabela titulo="Últimos 30 dias" linhas={dados.trinta} />
        </div>
      ) : null}
    </section>
  );
}
