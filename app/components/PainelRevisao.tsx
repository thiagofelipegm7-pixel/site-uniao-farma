"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APROVACAO_DO_MOTIVO, CATEGORIAS_VALIDAS, type Aprovacao, type ItemDaFila, type MapaAprovacoes, type TipoAprovacao } from "../revisao";
import "../metrics-polish.css";
import "./painel-revisao.css";

type Resposta = {
  ok: boolean;
  geradoEm: string | null;
  itens: ItemDaFila[];
  aprovacoes: MapaAprovacoes;
  historico: { chave: string; tipo: string; acao: string; por: string; quando: string; anterior: string | null; novo: string | null }[];
};

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const CHAVE_NOME = "uf_revisao_nome";
const quandoBR = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function PainelRevisao() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const [por, setPor] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<Record<string, string>>({});
  const [motivoTexto, setMotivoTexto] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch("/api/interno/revisao", { cache: "no-store" });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign("/interno/entrar?next=%2Finterno%2Frevisao");
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
    /* eslint-disable react-hooks/set-state-in-effect -- carga inicial e nome lembrado neste aparelho */
    void carregar();
    try {
      setPor(window.localStorage.getItem(CHAVE_NOME) ?? "");
    } catch {
      // sem armazenamento
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [carregar]);

  const aprovadas = useMemo(() => dados?.aprovacoes ?? {}, [dados]);
  const grupos = useMemo(() => {
    const m = new Map<string, ItemDaFila[]>();
    for (const i of dados?.itens ?? []) m.set(i.rotulo, [...(m.get(i.rotulo) ?? []), i]);
    return [...m];
  }, [dados]);

  function guardarNome(v: string) {
    setPor(v);
    try {
      window.localStorage.setItem(CHAVE_NOME, v);
    } catch {
      // sem armazenamento
    }
  }

  async function enviar(url: string, corpo: Record<string, unknown>, id: string) {
    if (por.trim().length < 2) {
      setAviso("Escreva seu nome no topo antes de aprovar: fica registrado quem aprovou.");
      return;
    }
    setOcupado(id);
    setAviso("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...corpo, por: por.trim() }) });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        const msg: Record<string, string> = { explique_o_motivo: "Para vender acima do teto da CMED, escreva o motivo.", categoria_invalida: "Escolha uma categoria.", quem_aprova: "Escreva seu nome.", corrigir_na_origem: "Esse caso se corrige no DMaster, não aqui.", fora_da_fila: "Esse item já saiu da fila. Recarregue a página." };
        setAviso(msg[j?.erro ?? ""] ?? "Não consegui registrar agora. Tente de novo.");
        return;
      }
      setAviso("Registrado. O site atualiza na próxima publicação (alguns minutos).");
      await carregar();
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  const aprovado = (i: ItemDaFila): Aprovacao | undefined => {
    const tipo = APROVACAO_DO_MOTIVO[i.motivo];
    return tipo ? aprovadas[i.chave]?.[tipo] : undefined;
  };

  return (
    <section className="painel-revisao">
      <h1>Fila de revisão</h1>
      <p className="pr-ajuda">
        Aqui ficam os produtos que a sincronização <strong>segurou</strong> por parecerem errados: preço que mudou mais de 20%, preço acima do teto da CMED, sem categoria
        ou sem enquadramento confirmado. Cada aprovação registra quem aprovou, quando e o motivo, e pode ser desfeita.
      </p>
      <label className="pr-quem">
        Quem está aprovando?
        <input type="text" value={por} onChange={(e) => guardarNome(e.target.value)} placeholder="Seu nome" maxLength={60} autoComplete="name" />
      </label>
      {aviso ? <p className="pr-aviso" role="status">{aviso}</p> : null}
      {erro ? <p role="alert">Não consegui ler a fila agora. <button type="button" onClick={() => void carregar()}>Tentar de novo</button></p> : null}
      {!dados && !erro ? <p>Carregando…</p> : null}

      {dados ? (
        <>
          <p className="pr-resumo" role="status">
            {dados.itens.length === 0 ? "Nenhum item esperando revisão." : `${dados.itens.length} ${dados.itens.length === 1 ? "item espera" : "itens esperam"} revisão.`}
            {dados.geradoEm ? ` Fila da sincronização de ${dados.geradoEm.slice(0, 16).replace("T", " às ")}.` : ""}
          </p>
          {grupos.map(([rotulo, itens]) => (
            <section key={rotulo} className="pr-grupo" aria-label={rotulo}>
              <h2>{rotulo} ({itens.length})</h2>
              <ul>
                {itens.map((i) => {
                  const id = `${i.chave}|${i.motivo}`;
                  const tipo = APROVACAO_DO_MOTIVO[i.motivo];
                  const ja = aprovado(i);
                  return (
                    <li key={id} className="pr-item">
                      <strong>{i.nome}</strong>
                      {i.lab ? <small>{i.lab}</small> : null}
                      <p>{i.detalhe}</p>
                      {i.precoNovo !== null || i.precoAtual !== null ? (
                        <p className="pr-precos">
                          {i.precoAtual !== null ? <span>No site: {REAIS.format(i.precoAtual)}</span> : null}
                          {i.precoNovo !== null ? <span>Novo: {REAIS.format(i.precoNovo)}</span> : null}
                        </p>
                      ) : null}
                      {ja ? (
                        <p className="pr-ok">Aprovado por {ja.por} em {quandoBR(ja.quando)}. Vale na próxima publicação.</p>
                      ) : !tipo ? (
                        <p className="pr-origem">Corrija no DMaster (preço de venda ou nome do produto). Some da fila sozinho na próxima sincronização.</p>
                      ) : (
                        <div className="pr-acoes">
                          {tipo === "categoria" ? (
                            <select value={categoria[id] ?? ""} onChange={(e) => setCategoria((c) => ({ ...c, [id]: e.target.value }))} aria-label={`Categoria de ${i.nome}`}>
                              <option value="">Escolha a categoria</option>
                              {CATEGORIAS_VALIDAS.map((c) => <option key={c}>{c}</option>)}
                            </select>
                          ) : null}
                          {tipo === "pmc" ? (
                            <input type="text" value={motivoTexto[id] ?? ""} onChange={(e) => setMotivoTexto((m) => ({ ...m, [id]: e.target.value }))} placeholder="Por que vender acima do teto? (obrigatório)" maxLength={300} aria-label="Motivo" />
                          ) : null}
                          <button type="button" className="pr-aprovar" disabled={ocupado === id} onClick={() => void enviar("/api/interno/revisao/aprovar", { chave: i.chave, motivoFila: i.motivo, valor: categoria[id], motivo: motivoTexto[id] ?? "" }, id)}>
                            {ocupado === id ? "Enviando…" : tipo === "pmc" ? "Liberar mesmo assim" : tipo === "variacao" ? "Aprovar o preço novo" : tipo === "enquadramento" ? "Confirmar enquadramento" : "Aprovar categoria"}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="pr-grupo" aria-label="Aprovações registradas">
            <h2>Aprovações registradas</h2>
            <ul>
              {Object.entries(aprovadas).flatMap(([chave, tipos]) => Object.entries(tipos).map(([tipo, a]) => ({ chave, tipo: tipo as TipoAprovacao, a: a as Aprovacao }))).filter((x) => x.tipo !== "enquadramento" || x.a.por !== "Thiago Felipe").slice(0, 100).map(({ chave, tipo, a }) => (
                <li key={`${chave}|${tipo}`} className="pr-item">
                  <strong>{chave.split("|")[0]}</strong>
                  <p>{tipo} · {String(a.valor)} · por {a.por} em {quandoBR(a.quando)}{a.motivo ? ` · ${a.motivo}` : ""}</p>
                  <button type="button" className="pr-desfazer" disabled={ocupado === `${chave}|${tipo}`} onClick={() => void enviar("/api/interno/revisao/desfazer", { chave, tipo }, `${chave}|${tipo}`)}>Desfazer</button>
                </li>
              ))}
            </ul>
            {Object.keys(aprovadas).length === 0 ? <p>Nenhuma aprovação feita por aqui ainda.</p> : null}
          </section>
        </>
      ) : null}
    </section>
  );
}
