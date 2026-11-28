"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lembrar } from "../recompra";
import "./pre-vendas.css";
import "./painel-recompra.css";

const data = (texto: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(texto));
const telefoneBonito = (t: string) => t.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

/** Lembrete de recompra: o operador abre o WhatsApp com a mensagem pronta e envia ele mesmo. Nada sai sozinho. */
export default function PainelRecompra({ nivel = 1 }: { /** 1 = h1 (página própria); 2 = h2 (dentro de uma aba). */ nivel?: 1 | 2 } = {}) {
  const [lista, setLista] = useState<Lembrar[]>([]);
  const [enviados, setEnviados] = useState(0);
  const [optouts, setOptouts] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/interno/recompra", { cache: "no-store" });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const json = (await resposta.json()) as { ok?: boolean; erro?: string; pendentes?: Lembrar[]; enviados?: number; optouts?: number };
      if (!resposta.ok || !json.ok) throw new Error(json.erro || "falha");
      setLista(Array.isArray(json.pendentes) ? json.pendentes : []);
      setEnviados(Number(json.enviados) || 0);
      setOptouts(Number(json.optouts) || 0);
      setErro("");
    } catch (falha) {
      setErro(falha instanceof Error && falha.message === "sem_banco" ? "O banco não está disponível agora." : "Não foi possível carregar agora. Confira a conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(t);
  }, [carregar]);

  async function marcar(id: string, acao: "enviado" | "optout") {
    if (acao === "optout" && !window.confirm("Marcar que este cliente não quer mais lembretes? O nome e o telefone dele serão apagados.")) return;
    setSalvando(id);
    setAviso("");
    try {
      const resposta = await fetch("/api/interno/recompra", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, acao }) });
      if (!resposta.ok) throw new Error("falha");
      setAviso(acao === "enviado" ? "Marcado como enviado." : "Pronto: esse cliente não recebe mais lembretes e os dados dele foram apagados.");
      await carregar();
    } catch {
      setErro("Não foi possível salvar agora. Confira a internet e tente novamente — nenhum dado foi perdido.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="pvendas-pagina precompra">
      <header className="pvendas-cabeca">
        <div>
          <p className="pvendas-eyebrow">Área da equipe</p>
          {nivel === 2 ? <h2>Lembrete de recompra</h2> : <h1>Lembrete de recompra</h1>}
          <p className="pvendas-lead">Clientes que pediram lembrete no site e levaram, há uns 30 dias, fralda, higiene, dermocosmético, perfumaria ou suplemento. Medicamento nunca entra.</p>
        </div>
        <button className="pvendas-atualizar" type="button" onClick={() => void carregar()} disabled={carregando}>Atualizar</button>
      </header>

      <p className="pvendas-nota">Toque em <strong>Abrir WhatsApp</strong>, confira a mensagem e envie você mesmo. Depois toque em <strong>Marcar enviado</strong>. Se o cliente responder SAIR, marque <strong>Não quer mais</strong>: o nome e o telefone são apagados e o número não aparece mais.</p>
      {erro ? <p className="pvendas-erro" role="alert">{erro}</p> : null}
      {aviso ? <p className="pvendas-aviso" role="status">{aviso}</p> : null}

      <section className="pvendas-indicadores" aria-label="Resumo">
        <article><span>Para lembrar hoje</span><strong>{lista.length}</strong><small>clientes com consentimento</small></article>
        <article><span>Já enviados</span><strong>{enviados}</strong><small>nos últimos 90 dias</small></article>
        <article><span>Não querem mais</span><strong>{optouts}</strong><small>números bloqueados</small></article>
      </section>

      <section className="pvendas-lista" aria-labelledby="precompra-lista">
        <h2 id="precompra-lista" className="precompra-titulo">Para lembrar</h2>
        {carregando && lista.length === 0 ? <p className="pvendas-vazio">Carregando…</p> : lista.length === 0 ? (
          <div className="pvendas-vazio"><strong>Ninguém para lembrar hoje.</strong><span>Entram aqui só clientes que marcaram a caixa de lembrete no site, uns 30 dias depois do pedido.</span></div>
        ) : (
          <div className="pvendas-cartoes">
            {lista.map((c) => (
              <article className="pvenda-card precompra-card" key={c.id}>
                <header className="pvenda-topo">
                  <div><strong className="precompra-nome">{c.nome}</strong><span className="precompra-tel">{telefoneBonito(c.telefone)}</span></div>
                  <span className="pvenda-status">há {c.diasDesde} dias</span>
                </header>
                <p className="pvenda-loja">Pedido de {data(c.pedidoEm)}</p>
                <ul className="pvenda-itens">{c.produtos.map((p) => <li key={p}><span>{p}</span></li>)}</ul>
                <p className="precompra-msg">{c.mensagem}</p>
                <div className="precompra-acoes">
                  <a className="precompra-whats" href={c.link} target="_blank" rel="noreferrer" onClick={() => setAbertos((s) => new Set(s).add(c.id))}>Abrir WhatsApp</a>
                  <button type="button" className="precompra-enviado" disabled={salvando === c.id} onClick={() => void marcar(c.id, "enviado")}>{abertos.has(c.id) ? "Marcar enviado ✓" : "Marcar enviado"}</button>
                  <button type="button" className="precompra-sair" disabled={salvando === c.id} onClick={() => void marcar(c.id, "optout")}>Não quer mais</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
