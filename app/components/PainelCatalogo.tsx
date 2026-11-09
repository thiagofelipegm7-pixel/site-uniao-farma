"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatarIdade,
  formatarQuandoBRT,
  type EventoHistorico,
  type Saude,
  type StatusCatalogo,
  type StatusPc,
  type UsoIA,
} from "../catalogo-painel";
import "../metrics-polish.css";
import "../catalogo-painel.css";

type Painel = {
  catalogo: StatusCatalogo;
  saude: Saude;
  pc: StatusPc | null;
  ia: { hoje: UsoIA; seteDias: UsoIA } | null;
  forcar: { configurado: boolean };
  ajuda: { ritmo: string };
};

const TIPO_IA: Record<string, string> = { busca: "Busca inteligente", receita: "Leitura de receita" };
const RESULTADO_IA: Record<string, string> = {
  ia: "Respondida pela IA",
  cache: "Resposta guardada (sem custo)",
  limite: "Barrada pelo limite",
  tempo: "Demorou demais",
  "erro-ia": "Erro da IA",
  erro: "Erro",
  invalida: "Resposta descartada",
  "sem-binding": "IA indisponível",
};

function TabelaIA({ titulo, uso }: { titulo: string; uso: UsoIA }) {
  const tipos = ["busca", "receita"];
  return (
    <div className="painel-ia-col">
      <h3>{titulo}</h3>
      {tipos.map((tipo) => {
        const linhas = uso.filter((l) => l.tipo === tipo);
        const total = linhas.reduce((s, l) => s + l.n, 0);
        const gasto = linhas.filter((l) => l.resultado === "ia").reduce((s, l) => s + l.n, 0);
        return (
          <div className="painel-ia-bloco" key={tipo}>
            <p>
              <strong>{TIPO_IA[tipo]}</strong>: {total} {total === 1 ? "uso" : "usos"}, {gasto} {gasto === 1 ? "chamada" : "chamadas"} à IA
            </p>
            {linhas.length > 0 ? (
              <ul>
                {linhas.map((l) => (
                  <li key={l.resultado}>
                    {RESULTADO_IA[l.resultado] ?? l.resultado}: {l.n}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function textoEvento(e: EventoHistorico): { titulo: string; detalhe: string } {
  if (e.tipo === "completo") {
    return {
      titulo: "Envio completo do estoque",
      detalhe: e.aplicados > 0 ? `${e.aplicados} produtos no PC` : "Catálogo inteiro reenviado",
    };
  }
  const partes: string[] = [];
  if (e.aplicados > 0) partes.push(e.aplicados === 1 ? "1 produto alterado ou novo" : `${e.aplicados} produtos alterados ou novos`);
  if (e.removidos > 0) partes.push(e.removidos === 1 ? "1 saiu do estoque" : `${e.removidos} saíram do estoque`);
  return {
    titulo: "Mudança de estoque ou preço",
    detalhe: partes.length ? partes.join(" · ") : "Atualização pequena",
  };
}

export default function PainelCatalogo() {
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/interno/catalogo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: Painel) => {
        setDados(p);
        setErro("");
      })
      .catch(() => setErro("Não deu para ler o painel agora. Atualize a página."));
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  async function forcar() {
    setOcupado(true);
    setAviso("");
    try {
      const r = await fetch("/api/interno/catalogo", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string };
      if (j.ok) {
        setAviso("Pedido enviado. O site vai republicar o catálogo que já está no servidor (uns 4 minutos se houver mudança). Isso não manda o PC ler o Dmaster de novo.");
        setTimeout(carregar, 15_000);
      } else if (j.erro === "aguarde") setAviso("Já pedido há pouco. Aguarde 2 minutos para pedir de novo.");
      else if (j.erro === "token_ausente") setAviso("O botão ainda não foi ligado. Falta configurar o segredo no site.");
      else setAviso("Não deu para pedir agora. Tente de novo em instantes.");
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  const c = dados?.catalogo;
  const pc = dados?.pc;
  const ultimoDelta = pc?.historico?.find((e) => e.tipo === "delta" || e.tipo === "completo") ?? null;
  const mudancasUltimo = ultimoDelta ? ultimoDelta.aplicados + ultimoDelta.removidos : null;

  return (
    <div className="metrics-page painel-catalogo">
      <div className="metrics-wrap">
        <div className="metrics-top">
          <div>
            <p className="eyebrow">Uso interno</p>
            <h1>Estoque da loja</h1>
            <p className="metrics-lead">Acompanha o PC da Nações Unidas que manda o estoque para o site.</p>
          </div>        </div>

        {erro ? <p className="metrics-error">{erro}</p> : null}
        {!dados && !erro ? <p className="metrics-lead">Carregando…</p> : null}

        {dados && c ? (
          <>
            <section
              className={`painel-saude ${pc ? (pc.online ? "painel-saude-ok" : "painel-saude-problema") : `painel-saude-${dados.saude.nivel}`}`}
              role="status"
            >
              <span className="painel-selo">{pc ? (pc.online ? "Online" : "Offline") : dados.saude.nivel === "ok" ? "Tudo certo" : dados.saude.nivel === "atencao" ? "Atenção" : "Problema"}</span>
              <div>
                <strong>PC do estoque: {pc ? (pc.online ? "ligado" : "sem sinal") : "sem leitura ao vivo"}</strong>
                <p>
                  {pc
                    ? pc.online
                      ? `Último sinal ${formatarQuandoBRT(pc.batimentoEm)} (há ${formatarIdade(pc.idadeBatimentoHoras)}).`
                      : `Sem sinal desde ${formatarQuandoBRT(pc.batimentoEm)} (há ${formatarIdade(pc.idadeBatimentoHoras)}). Confira o TERMINAL02.`
                    : dados.saude.detalhe}
                </p>
              </div>
            </section>

            <p className="painel-nota painel-ritmo">{dados.ajuda.ritmo}</p>

            <div className="metrics-grid">
              <article className="metrics-card">
                <strong>Última mudança de estoque/preço</strong>
                <span className="painel-valor">{formatarQuandoBRT(pc?.mudancaEm || pc?.geradoEm || c.geradoEm)}</span>
                <small>
                  {mudancasUltimo !== null && mudancasUltimo > 0
                    ? mudancasUltimo === 1
                      ? "1 produto na última atualização"
                      : `${mudancasUltimo} produtos na última atualização`
                    : "Quando o PC manda uma alteração"}
                </small>
              </article>
              <article className="metrics-card">
                <strong>Produtos no PC</strong>
                <span className="painel-valor">{pc?.total ?? c.total}</span>
                <small>No site (sem receita): {c.total}</small>
              </article>
              <article className="metrics-card">
                <strong>Último sinal do PC</strong>
                <span className="painel-valor">{formatarIdade(pc?.idadeBatimentoHoras ?? c.idadeHoras)}</span>
                <small>{formatarQuandoBRT(pc?.batimentoEm || c.geradoEm)}</small>
              </article>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
