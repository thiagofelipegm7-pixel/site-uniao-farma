"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ItemPedido = { nome: string; quantidade: number; precoCentavos: number };
type Linha =
  | { tipo: "atual"; indice: number; nome: string; precoCentavos: number; quantidade: number }
  | { tipo: "novo"; slug: string; nome: string; precoCentavos: number; quantidade: number };
type Achado = { slug: string; nome: string; precoCentavos: number };

const QTD_MAX = 20;
const CHAVE_AUTOR = "uf_equipe_nome";
const dinheiro = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Edição dos itens de um pedido pela equipe. O preço vem do pedido salvo ou do catálogo; o total final é calculado no servidor. */
export default function PedidoEditor({
  id,
  codigo,
  atualizadoEm,
  itens,
  totalCentavos,
  aviso,
  onCancelar,
  onSalvo,
}: {
  id: string;
  codigo: string;
  atualizadoEm: string;
  itens: ItemPedido[];
  totalCentavos: number;
  aviso: string | null;
  onCancelar: () => void;
  onSalvo: (mensagem: string) => void | Promise<void>;
}) {
  const base = useId();
  const [linhas, setLinhas] = useState<Linha[]>(() => itens.map((item, indice) => ({ tipo: "atual", indice, ...item })));
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [autor, setAutor] = useState("");
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Achado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const pedidoBusca = useRef(0);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_AUTOR);
      if (salvo) window.setTimeout(() => setAutor(salvo), 0);
    } catch {
      /* sem localStorage */
    }
  }, []);

  useEffect(() => {
    const termo = busca.trim();
    const n = ++pedidoBusca.current;
    if (termo.length < 2) {
      const t = window.setTimeout(() => setAchados([]), 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await fetch(`/api/interno/pre-vendas/catalogo?q=${encodeURIComponent(termo)}`, { cache: "no-store" });
        const j = (await r.json()) as { itens?: Achado[] };
        if (n === pedidoBusca.current) setAchados(Array.isArray(j.itens) ? j.itens : []);
      } catch {
        if (n === pedidoBusca.current) setAchados([]);
      } finally {
        if (n === pedidoBusca.current) setBuscando(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [busca]);

  const novoTotal = useMemo(() => linhas.reduce((s, l) => s + l.precoCentavos * l.quantidade, 0), [linhas]);
  const mudou = useMemo(() => {
    if (linhas.length !== itens.length) return true;
    return linhas.some((l, i) => l.tipo !== "atual" || l.indice !== i || l.quantidade !== itens[i].quantidade);
  }, [itens, linhas]);
  const autorOk = autor.trim().length >= 2 && autor.trim().length <= 40;

  function mudarQtd(pos: number, delta: number) {
    setLinhas((atual) => atual.map((l, i) => (i === pos ? { ...l, quantidade: Math.min(QTD_MAX, Math.max(1, l.quantidade + delta)) } : l)));
  }
  function remover(pos: number) {
    setLinhas((atual) => atual.filter((_, i) => i !== pos));
    setConfirmar(null);
  }
  function incluir(a: Achado) {
    setLinhas((atual) => {
      const existente = atual.findIndex((l) => l.nome === a.nome);
      if (existente >= 0) return atual.map((l, i) => (i === existente ? { ...l, quantidade: Math.min(QTD_MAX, l.quantidade + 1) } : l));
      return [...atual, { tipo: "novo", slug: a.slug, nome: a.nome, precoCentavos: a.precoCentavos, quantidade: 1 }];
    });
    setBusca("");
    setAchados([]);
  }

  async function salvar() {
    if (!mudou || !autorOk || linhas.length === 0) return;
    setSalvando(true);
    setErro("");
    try {
      try {
        window.localStorage.setItem(CHAVE_AUTOR, autor.trim());
      } catch {
        /* sem localStorage */
      }
      const r = await fetch("/api/interno/pre-vendas", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          atualizadoEm,
          por: autor.trim(),
          itens: linhas.map((l) => (l.tipo === "atual" ? { indice: l.indice, quantidade: l.quantidade } : { slug: l.slug, quantidade: l.quantidade })),
        }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; mensagem?: string; totalCentavos?: number };
      if (!r.ok || !j.ok) throw new Error(j.mensagem || "Não foi possível salvar. Tente novamente.");
      await onSalvo(`Pedido #${codigo} alterado. Nova estimativa: ${dinheiro(Number(j.totalCentavos) || 0)}.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="pedit" aria-label={`Editar itens do pedido #${codigo}`}>
      {aviso ? <p className="pedit-alerta" role="note">{aviso}</p> : null}
      <ul className="pedit-lista">
        {linhas.map((l, pos) => (
          <li key={l.tipo === "atual" ? `a${l.indice}` : `n${l.slug}`} className="pedit-item">
            <div className="pedit-item-info">
              <span className="pedit-nome">{l.nome}</span>
              <small>{dinheiro(l.precoCentavos)} cada{l.tipo === "novo" ? " · incluído agora (preço do site)" : ""}</small>
            </div>
            {confirmar === pos ? (
              <div className="pedit-confirma" role="group" aria-label={`Confirmar remoção de ${l.nome}`}>
                <span>Tirar do pedido?</span>
                <button type="button" className="pedit-btn pedit-perigo" onClick={() => remover(pos)}>Sim, tirar</button>
                <button type="button" className="pedit-btn" onClick={() => setConfirmar(null)}>Não</button>
              </div>
            ) : (
              <div className="pedit-controles">
                <div className="pedit-qtd" role="group" aria-label={`Quantidade de ${l.nome}`}>
                  <button type="button" onClick={() => mudarQtd(pos, -1)} disabled={l.quantidade <= 1} aria-label="Diminuir">−</button>
                  <output aria-live="polite">{l.quantidade}</output>
                  <button type="button" onClick={() => mudarQtd(pos, 1)} disabled={l.quantidade >= QTD_MAX} aria-label="Aumentar">+</button>
                </div>
                <b className="pedit-sub">{dinheiro(l.precoCentavos * l.quantidade)}</b>
                <button type="button" className="pedit-btn pedit-remover" onClick={() => setConfirmar(pos)} disabled={linhas.length <= 1} aria-label={`Tirar ${l.nome} do pedido`}>Tirar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {linhas.length <= 1 ? <p className="pedit-dica">O pedido precisa ter pelo menos um item. Se o cliente desistiu de tudo, mude o andamento para &quot;Não fechou&quot;.</p> : null}

      <div className="pedit-incluir">
        <label htmlFor={`${base}-busca`}>Incluir produto do catálogo</label>
        <input id={`${base}-busca`} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do produto" autoComplete="off" />
        {busca.trim().length >= 2 ? (
          <ul className="pedit-achados" aria-label="Produtos encontrados">
            {buscando && achados.length === 0 ? <li className="pedit-vazio">Buscando…</li> : null}
            {!buscando && achados.length === 0 ? <li className="pedit-vazio">Nenhum produto encontrado no catálogo.</li> : null}
            {achados.map((a) => (
              <li key={a.slug}>
                <button type="button" onClick={() => incluir(a)}>
                  <span>{a.nome}</span>
                  <b>{dinheiro(a.precoCentavos)}</b>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <label className="pedit-autor" htmlFor={`${base}-autor`}>
        <span>Quem está alterando</span>
        <input id={`${base}-autor`} value={autor} onChange={(e) => setAutor(e.target.value.slice(0, 40))} placeholder="Seu nome" autoComplete="given-name" />
      </label>

      <div className="pedit-total">
        <span>Estimativa atual {dinheiro(totalCentavos)}</span>
        <strong>Nova estimativa {dinheiro(novoTotal)}</strong>
      </div>
      {erro ? <p className="pvendas-erro" role="alert">{erro}</p> : null}
      <div className="pedit-acoes">
        <button type="button" className="pedit-btn" onClick={onCancelar} disabled={salvando}>Cancelar</button>
        <button type="button" className="pedit-btn pedit-salvar" onClick={() => void salvar()} disabled={!mudou || !autorOk || salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
      {!autorOk && mudou ? <p className="pedit-dica">Escreva seu nome para salvar (fica no histórico do pedido).</p> : null}
    </section>
  );
}
