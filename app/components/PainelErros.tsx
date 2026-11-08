"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LinhaErro } from "../erros";
import "../metrics-polish.css";
import "./painel-revisao.css";

type Resposta = { ok: boolean; desde: string; erros: LinhaErro[] };

const quandoBR = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Erros de JavaScript dos aparelhos dos clientes (últimos 7 dias), agrupados: o mesmo erro em vários dias e aparelhos vira uma linha. */
export default function PainelErros() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch("/api/interno/erros", { cache: "no-store" });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign("/interno/entrar?next=%2Finterno%2Ferros");
        return;
      }
      const j = (await r.json()) as Resposta;
      if (!r.ok || !j.ok) throw new Error("falha");
      setDados(j);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial do painel
    void carregar();
  }, [carregar]);

  const grupos = useMemo(() => {
    const m = new Map<string, { msg: string; arq: string; lin: number; total: number; dias: Set<string>; aparelhos: Set<string>; paginas: Set<string>; ultimo: string }>();
    for (const e of dados?.erros ?? []) {
      const g = m.get(e.chave) ?? { msg: e.msg, arq: e.arq, lin: e.lin, total: 0, dias: new Set<string>(), aparelhos: new Set<string>(), paginas: new Set<string>(), ultimo: e.ultimo };
      g.total += e.n;
      g.dias.add(e.dia);
      g.aparelhos.add(e.aparelho);
      g.paginas.add(e.pag);
      if (e.ultimo > g.ultimo) g.ultimo = e.ultimo;
      m.set(e.chave, g);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [dados]);

  return (
    <section className="painel-revisao">
      <h1>Erros no celular dos clientes</h1>
      <p className="pr-ajuda">
        Erros de JavaScript que acontecem nos aparelhos dos clientes, dos últimos 7 dias. Não guardamos nome, telefone, endereço nem o que a pessoa digitou:
        só a mensagem, o arquivo, a página e o tipo de aparelho. Se um erro aparece muito, me mande a linha.
      </p>
      {erro ? <p role="alert">Não consegui ler os erros agora. <button type="button" onClick={() => void carregar()}>Tentar de novo</button></p> : null}
      {!dados && !erro ? <p>Carregando…</p> : null}
      {dados ? (
        <>
          <p className="pr-resumo" role="status">{grupos.length === 0 ? "Nenhum erro registrado nos últimos 7 dias." : `${grupos.length} ${grupos.length === 1 ? "erro diferente" : "erros diferentes"}, ${grupos.reduce((s, g) => s + g.total, 0)} ocorrências.`}</p>
          <ul>
            {grupos.map((g) => (
              <li key={`${g.msg}|${g.arq}|${g.lin}`} className="pr-item">
                <strong>{g.msg}</strong>
                <p>{g.total} {g.total === 1 ? "vez" : "vezes"} em {g.dias.size} {g.dias.size === 1 ? "dia" : "dias"} · último em {quandoBR(g.ultimo)}</p>
                <small>{g.arq}{g.lin ? `:${g.lin}` : ""} · {[...g.paginas].slice(0, 3).join(", ")} · {[...g.aparelhos].slice(0, 4).join(", ")}</small>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
