"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChavePeriodo, PainelPedidos as Dados, ResumoPeriodo } from "../pedidos-resumo";
import type { Retirada } from "../retirada";
import "./pre-vendas.css";
import "./painel-pedidos.css";

const dinheiro = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataCurta = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/");
const SEM_DADOS = "sem dados ainda";
const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

function Valor({ centavos }: { centavos: number | null }) {
  return centavos === null ? <strong className="ppedidos-sem">{SEM_DADOS}</strong> : <strong>{dinheiro(centavos)}</strong>;
}

/** Painel interno: quantos pedidos, quanto valeram, o que mais saiu e o que procuraram e não acharam. */
export default function PainelPedidos({ nivel = 1 }: { /** 1 = h1 (página própria); 2 = h2 (dentro de uma aba). */ nivel?: 1 | 2 } = {}) {
  const [dados, setDados] = useState<Dados | null>(null);
  // null = a lista de retiradas não carregou (o resumo continua aparecendo).
  const [retiradas, setRetiradas] = useState<Retirada[] | null>(null);
  const [periodo, setPeriodo] = useState<ChavePeriodo>("hoje");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/interno/pedidos", { cache: "no-store" });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const json = (await resposta.json()) as { ok?: boolean; erro?: string; retiradas?: Retirada[] | null } & Partial<Dados>;
      if (!resposta.ok || !json.ok || !Array.isArray(json.periodos)) throw new Error(json.erro || "falha");
      setDados({ geradoEm: String(json.geradoEm), periodos: json.periodos, buscas: json.buscas ?? null });
      setRetiradas(Array.isArray(json.retiradas) ? json.retiradas : null);
      setErro("");
    } catch (falha) {
      setErro(falha instanceof Error && falha.message === "sem_banco" ? "O banco não está disponível agora. O resumo aparece quando a conexão voltar." : "Não foi possível carregar agora. Confira a conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const inicio = window.setTimeout(() => void carregar(), 0);
    const intervalo = window.setInterval(() => void carregar(), 120_000);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(intervalo);
    };
  }, [carregar]);

  const atual: ResumoPeriodo | undefined = dados?.periodos.find((p) => p.chave === periodo);
  const buscas = dados?.buscas?.[periodo] ?? null;

  return (
    <div className="pvendas-pagina ppedidos">
      <header className="pvendas-cabeca">
        <div>
          <p className="pvendas-eyebrow">Área da equipe</p>
          {nivel === 2 ? <h2>Pedidos do site</h2> : <h1>Pedidos do site</h1>}
          <p className="pvendas-lead">Resumo das cestas que os clientes fecharam no site e mandaram pelo WhatsApp, os produtos que mais saíram e o que procuraram sem achar.</p>
        </div>
        <button className="pvendas-atualizar" type="button" onClick={() => void carregar()} disabled={carregando}>Atualizar</button>
      </header>

      {dados ? (
        <section className="pvendas-lista ppedidos-retiradas" aria-labelledby="ppedidos-retiradas">
          <h2 id="ppedidos-retiradas" className="ppedidos-titulo">Retiradas na loja</h2>
          <p className="ppedidos-dica">Pedidos para retirar no balcão, ainda em aberto (últimos 7 dias). Quando o pedido estiver separado, toque em &quot;Avisar que está pronto&quot;: o WhatsApp abre com a mensagem pronta e você confere antes de enviar. Nada é enviado sozinho.</p>
          {retiradas === null ? (
            <p className="ppedidos-vazio">Não foi possível carregar as retiradas agora.</p>
          ) : retiradas.length === 0 ? (
            <p className="ppedidos-vazio">Nenhuma retirada em aberto.</p>
          ) : (
            <ul className="ppedidos-retirada-lista">
              {retiradas.map((r) => (
                <li key={r.id} className="ppedidos-retirada">
                  <div className="ppedidos-retirada-topo">
                    <span className="ppedidos-retirada-tags">
                      <span className="pvenda-codigo">#{r.codigo}</span>
                      <span className="ppedidos-tag-retirada">Retirada</span>
                      {r.comReceita ? <span className="ppedidos-tag-receita">Tem item com receita</span> : null}
                    </span>
                    <span className={`pvenda-status pvenda-status-${r.status}`}>{r.status === "nova" ? "Nova" : "Em atendimento"}</span>
                  </div>
                  <p className="ppedidos-retirada-info">
                    {r.lojaNome} · <time dateTime={r.criadoEm}>{dataHora(r.criadoEm)}</time> · {r.itens} {r.itens === 1 ? "item" : "itens"}
                    {r.totalCentavos !== null ? <> · estimativa {dinheiro(r.totalCentavos)}</> : null}
                  </p>
                  <a className="ppedidos-pronto" href={r.linkPronto} target="_blank" rel="noreferrer">Avisar que está pronto</a>
                  {!r.temWhatsapp ? <p className="ppedidos-retirada-sem">O cliente não deixou WhatsApp no site: escolha a conversa do pedido #{r.codigo}.</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="ppedidos-abas" role="tablist" aria-label="Período">
        {(dados?.periodos ?? [{ chave: "hoje", rotulo: "Hoje" }, { chave: "7d", rotulo: "Últimos 7 dias" }, { chave: "30d", rotulo: "Últimos 30 dias" }]).map((p) => (
          <button key={p.chave} type="button" role="tab" aria-selected={periodo === p.chave} onClick={() => setPeriodo(p.chave as ChavePeriodo)}>{p.rotulo}</button>
        ))}
      </div>

      {erro ? <p className="pvendas-erro" role="alert">{erro}</p> : null}
      {carregando && !dados ? <p className="pvendas-vazio">Carregando resumo…</p> : null}

      {atual ? (
        <>
          <section className="pvendas-indicadores ppedidos-indicadores" aria-label={`Resumo: ${atual.rotulo}`}>
            <article><span>Pedidos</span><strong>{atual.pedidos}</strong><small>{atual.pedidos ? `${atual.emAberto} em aberto · ${atual.concluidos} concluídos · ${atual.cancelados} não fecharam` : "nenhuma cesta enviada no período"}</small></article>
            <article><span>Faturamento</span><Valor centavos={atual.faturamentoCentavos} /><small>só vendas marcadas como concluídas em Pré-vendas, pelo preço do site</small></article>
            <article><span>Valor das cestas</span><Valor centavos={atual.valorCestasCentavos} /><small>estimativa das cestas enviadas (sem as que não fecharam)</small></article>
          </section>

          <div className="ppedidos-colunas">
            <section className="pvendas-lista" aria-labelledby="ppedidos-mais">
              <h2 id="ppedidos-mais" className="ppedidos-titulo">Produtos mais pedidos</h2>
              {atual.maisVendidos.length === 0 ? (
                <p className="ppedidos-vazio">Sem dados ainda neste período.</p>
              ) : (
                <ol className="ppedidos-ranking">
                  {atual.maisVendidos.map((p) => (
                    <li key={p.nome}><span>{p.nome}</span><b>{p.quantidade} un.</b><small>{p.pedidos} {p.pedidos === 1 ? "pedido" : "pedidos"}</small></li>
                  ))}
                </ol>
              )}
            </section>

            <section className="pvendas-lista" aria-labelledby="ppedidos-buscas">
              <h2 id="ppedidos-buscas" className="ppedidos-titulo">Buscas sem resultado</h2>
              <p className="ppedidos-dica">O que os clientes procuraram e a loja não tinha no site: pode ser falta no estoque ou outro nome.</p>
              {!buscas || buscas.length === 0 ? (
                <p className="ppedidos-vazio">Sem dados ainda neste período.</p>
              ) : (
                <ol className="ppedidos-ranking">
                  {buscas.map((b) => (
                    <li key={b.termo}><span>{b.termo}</span><b>{b.total}×</b><small>{b.vazia ? `${b.vazia} sem nada` : "achou parecido"} · último {dataCurta(b.ultimo)}</small></li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <p className="pvendas-nota">Cada pedido é uma cesta que o cliente fechou no site e abriu no WhatsApp; a venda só conta como faturamento quando a equipe marca &quot;Venda concluída&quot; em Pré-vendas. Nome, telefone e endereço não são guardados, a não ser o nome e o WhatsApp de quem aceitou o lembrete de recompra e o WhatsApp opcional do aviso de retirada (apagado quando a pré-venda é concluída ou cancelada). Os registros ficam 90 dias.</p>
        </>
      ) : null}
    </div>
  );
}
