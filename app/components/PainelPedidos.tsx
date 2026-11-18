"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChavePeriodo, PainelPedidos as Dados, ResumoPeriodo } from "../pedidos-resumo";
import "./pre-vendas.css";
import "./painel-pedidos.css";

const dinheiro = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataCurta = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/");
const SEM_DADOS = "sem dados ainda";

function Valor({ centavos }: { centavos: number | null }) {
  return centavos === null ? <strong className="ppedidos-sem">{SEM_DADOS}</strong> : <strong>{dinheiro(centavos)}</strong>;
}

/** Painel interno: quantos pedidos, quanto valeram, o que mais saiu e o que procuraram e não acharam. */
export default function PainelPedidos() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [periodo, setPeriodo] = useState<ChavePeriodo>("hoje");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/interno/pedidos", { cache: "no-store" });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent("/interno/pedidos")}`);
        return;
      }
      const json = (await resposta.json()) as { ok?: boolean; erro?: string } & Partial<Dados>;
      if (!resposta.ok || !json.ok || !Array.isArray(json.periodos)) throw new Error(json.erro || "falha");
      setDados({ geradoEm: String(json.geradoEm), periodos: json.periodos, buscas: json.buscas ?? null });
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
          <h1>Pedidos do site</h1>
          <p className="pvendas-lead">Resumo das cestas que os clientes fecharam no site e mandaram pelo WhatsApp, os produtos que mais saíram e o que procuraram sem achar.</p>
        </div>
        <button className="pvendas-atualizar" type="button" onClick={() => void carregar()} disabled={carregando}>Atualizar</button>
      </header>

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

          <p className="pvendas-nota">Cada pedido é uma cesta que o cliente fechou no site e abriu no WhatsApp; a venda só conta como faturamento quando a equipe marca &quot;Venda concluída&quot; em Pré-vendas. Nome, telefone e endereço não são guardados. Os registros ficam 90 dias.</p>
        </>
      ) : null}
    </div>
  );
}
