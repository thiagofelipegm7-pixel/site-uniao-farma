"use client";

import { useCallback, useEffect, useState } from "react";
import type { Alerta, TipoAlerta } from "../estoque-alertas";
import "../metrics-polish.css";
import "../catalogo-painel.css";

type Resposta = {
  ok: boolean;
  erro?: string;
  dia: string;
  geradoEm: string | null;
  diasRegistrados: number;
  semBanco: boolean;
  totais: Record<TipoAlerta, number>;
  alertas: Alerta[];
  resumo: string;
};

const GRUPOS: Array<{ tipo: TipoAlerta; titulo: string; ajuda: string }> = [
  { tipo: "esgotado", titulo: "Acabou", ajuda: "Tinha estoque nas últimas semanas e agora está zerado." },
  { tipo: "acabando", titulo: "Vai acabar", ajuda: "No ritmo de venda atual, acaba em até 7 dias." },
  { tipo: "baixo", titulo: "Estoque baixo", ajuda: "De 1 a 5 unidades. É o mesmo limite do aviso \"Resta N\" do site." },
  { tipo: "parado", titulo: "Parado", ajuda: "Sem nenhuma venda há mais de 21 dias. Ordenado pelo valor parado." },
];

export default function PainelEstoque() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch("/api/interno/estoque", { cache: "no-store" });
      const j = (await r.json()) as Resposta;
      if (!r.ok || !j.ok) throw new Error(j.erro ?? "falha");
      setDados(j);
    } catch {
      setErro("Não consegui ler o estoque agora. O PC da loja ou o acesso aos dados pode estar parado.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial do painel
    void carregar();
  }, [carregar]);

  async function registrarHoje() {
    setAviso(null);
    const r = await fetch("/api/interno/estoque", { method: "POST" }).catch(() => null);
    setAviso(r?.ok ? "Estoque de hoje registrado." : "Não consegui registrar agora.");
    if (r?.ok) void carregar();
  }

  async function copiar() {
    if (!dados) return;
    try {
      await navigator.clipboard.writeText(dados.resumo);
      setAviso("Resumo copiado. É só colar no WhatsApp.");
    } catch {
      setAviso("Não consegui copiar. Selecione o texto abaixo.");
    }
  }

  return (
    <main className="painel-catalogo">
      <h1>Alertas de estoque</h1>
      <p>
        <a href="/interno/catalogo">Estoque da loja (saúde da sincronização)</a> · <a href="/interno/metricas">Métricas</a>
      </p>
      {erro ? <p role="alert">{erro}</p> : null}
      {!dados && !erro ? <p>Carregando…</p> : null}
      {dados ? (
        <>
          <p>
            Dados de {dados.geradoEm ?? "—"}. Histórico guardado: {dados.diasRegistrados} {dados.diasRegistrados === 1 ? "dia" : "dias"}.
            {dados.diasRegistrados < 7 ? " A previsão de \"vende X por semana\" aparece depois de uns 7 dias de histórico; até lá valem só os avisos de estoque baixo e de item que acabou." : ""}
            {dados.semBanco ? " O banco de histórico não está ligado neste ambiente." : ""}
          </p>
          <p>
            <button type="button" onClick={registrarHoje}>Registrar o estoque de hoje agora</button>{" "}
            <button type="button" onClick={copiar}>Copiar resumo para o WhatsApp</button>
          </p>
          {aviso ? <p role="status">{aviso}</p> : null}
          {GRUPOS.map((g) => {
            const lista = dados.alertas.filter((a) => a.tipo === g.tipo);
            return (
              <section key={g.tipo} aria-label={g.titulo}>
                <h2>{g.titulo} ({dados.totais[g.tipo]})</h2>
                <p>{g.ajuda}</p>
                {lista.length === 0 ? <p>Nada por aqui.</p> : (
                  <ul>
                    {lista.map((a) => (
                      <li key={a.chave}><strong>{a.nome}</strong>: {a.motivo}{a.valorParado ? ` (R$ ${a.valorParado.toFixed(2).replace(".", ",")} parados)` : ""}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          <h2>Resumo para o WhatsApp</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{dados.resumo}</pre>
        </>
      ) : null}
    </main>
  );
}
