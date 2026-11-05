"use client";

import { useCallback, useEffect, useState } from "react";
import { formatarIdade, type ExecucaoSync, type Saude, type StatusCatalogo, type UsoIA } from "../catalogo-painel";
import "../metrics-polish.css";
import "../catalogo-painel.css";

type Painel = {
  catalogo: StatusCatalogo;
  saude: Saude;
  sincronizacao: { execucoes: ExecucaoSync[] | null; repositorio: string };
  ia: { hoje: UsoIA; seteDias: UsoIA } | null;
  forcar: { configurado: boolean };
};

const NIVEL: Record<Saude["nivel"], string> = { ok: "Tudo certo", atencao: "Atenção", problema: "Problema" };
const ESTADO: Record<ExecucaoSync["estado"], string> = { sucesso: "Concluída", falha: "Falhou", andamento: "Em andamento", cancelado: "Cancelada" };
const ORIGEM: Record<ExecucaoSync["origem"], string> = { agendado: "Agendada", manual: "Manual", outro: "Outro" };
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

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function geradoEmLegivel(valor: string | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}` : "—";
}

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
        setAviso("Sincronização iniciada. Em 1 ou 2 minutos aparece na lista abaixo; o site publica uns 4 minutos depois de uma mudança.");
        setTimeout(carregar, 15_000);
      } else if (j.erro === "aguarde") setAviso("Já pedido há pouco. Aguarde 2 minutos para pedir de novo.");
      else if (j.erro === "token_ausente") setAviso("O botão ainda não foi ligado ao GitHub (falta o segredo GITHUB_DISPATCH_TOKEN).");
      else setAviso("O GitHub não aceitou o pedido agora. Tente de novo em instantes.");
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  const c = dados?.catalogo;
  return (
    <div className="metrics-page painel-catalogo">
      <div className="metrics-wrap">
        <div className="metrics-top">
          <div>
            <p className="eyebrow">Uso interno</p>
            <h1>Catálogo e sincronização</h1>
            <p className="metrics-lead">Dados da loja Nações Unidas que o site mostra, vindos do PC da loja.</p>
          </div>
          <div className="painel-links">
            <a className="metrics-exit" href="/interno/metricas">
              Métricas
            </a>
            <a className="metrics-exit" href="/interno/sair">
              Sair
            </a>
          </div>
        </div>

        {erro ? <p className="metrics-error">{erro}</p> : null}
        {!dados && !erro ? <p className="metrics-lead">Carregando…</p> : null}

        {dados && c ? (
          <>
            <section className={`painel-saude painel-saude-${dados.saude.nivel}`} role="status">
              <span className="painel-selo">{NIVEL[dados.saude.nivel]}</span>
              <div>
                <strong>{dados.saude.titulo}</strong>
                <p>{dados.saude.detalhe}</p>
              </div>
            </section>

            <div className="metrics-grid">
              <article className="metrics-card">
                <strong>Último envio do PC</strong>
                <span className="painel-valor">{formatarIdade(c.idadeHoras)}</span>
                <small>{geradoEmLegivel(c.geradoEm)} (horário de Brasília)</small>
              </article>
              <article className="metrics-card">
                <strong>Itens do catálogo</strong>
                <span className="painel-valor">{c.total}</span>
                <small>Só o que tem estoque; as quantidades não aparecem aqui.</small>
              </article>
              <article className="metrics-card">
                <strong>Fonte dos dados</strong>
                <span className="painel-valor">{c.fonte === "pc" ? "PC da loja" : "Reserva"}</span>
                <small>{c.fonte === "pc" ? "Envio recente do PC." : "Dados antigos do repositório: o PC parou de enviar ou a atualização foi recusada."}</small>
              </article>
            </div>

            <section className="metrics-block">
              <h2>Forçar atualização</h2>
              <p>Baixa agora o último envio do PC e refaz o catálogo, com as mesmas travas de segurança. Não faz o PC enviar de novo.</p>
              <div className="metrics-actions">
                <button type="button" disabled={ocupado || !dados.forcar.configurado} onClick={forcar}>
                  {ocupado ? "Pedindo…" : "Forçar atualização"}
                </button>
              </div>
              {!dados.forcar.configurado ? <p className="painel-nota">Botão desligado: falta configurar o segredo GITHUB_DISPATCH_TOKEN no site.</p> : null}
              {aviso ? (
                <div className="metrics-feedback-success" role="status">
                  {aviso}
                </div>
              ) : null}
            </section>

            <section className="metrics-block">
              <h2>Últimas sincronizações</h2>
              <p>
                O PC envia às 8h, 11h, 14h, 17h e 20h; o site confere 15 minutos depois.{" "}
                <a href={dados.sincronizacao.repositorio} target="_blank" rel="noopener noreferrer">
                  Ver no GitHub
                </a>
              </p>
              {dados.sincronizacao.execucoes === null ? (
                <p className="painel-nota">Não deu para consultar o GitHub agora.</p>
              ) : dados.sincronizacao.execucoes.length === 0 ? (
                <p className="painel-nota">Nenhuma execução ainda.</p>
              ) : (
                <ul className="painel-runs">
                  {dados.sincronizacao.execucoes.map((e) => (
                    <li key={e.id} className={`painel-run painel-run-${e.estado}`}>
                      <div className="painel-run-top">
                        <strong>{quando(e.quando)}</strong>
                        <span className="painel-chip">{ESTADO[e.estado]}</span>
                        <span className="painel-chip painel-chip-neutro">{ORIGEM[e.origem]}</span>
                        <a href={e.url} target="_blank" rel="noopener noreferrer">
                          detalhes
                        </a>
                      </div>
                      {e.mensagens.map((m, i) => (
                        <p key={i} className={`painel-msg painel-msg-${m.nivel}`}>
                          {m.texto}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="metrics-block">
              <h2>Uso da IA</h2>
              <p>Contagem desde que o painel foi ligado. Só números: nada do que foi digitado ou enviado é guardado.</p>
              {dados.ia === null ? (
                <p className="painel-nota">Contador indisponível agora.</p>
              ) : (
                <div className="painel-ia">
                  <TabelaIA titulo="Hoje" uso={dados.ia.hoje} />
                  <TabelaIA titulo="Últimos 7 dias" uso={dados.ia.seteDias} />
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
