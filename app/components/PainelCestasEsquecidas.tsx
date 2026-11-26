"use client";

import { useCallback, useEffect, useState } from "react";
import type { CestaParaAvisar } from "../cesta-esquecida";
import "./pre-vendas.css";
import "./painel-recompra.css";

const dataHora = (texto: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(texto));
const telefoneBonito = (t: string) => t.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

/** Cestas esquecidas: o operador abre o WhatsApp com a mensagem pronta e envia ele mesmo. Nada sai sozinho. */
export default function PainelCestasEsquecidas({ nivel = 1 }: { nivel?: 1 | 2 } = {}) {
  const [lista, setLista] = useState<CestaParaAvisar[]>([]);
  const [enviadas, setEnviadas] = useState(0);
  const [descartadas, setDescartadas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/interno/cestas-esquecidas", { cache: "no-store" });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const json = (await resposta.json()) as { ok?: boolean; erro?: string; pendentes?: CestaParaAvisar[]; enviadas?: number; descartadas?: number };
      if (!resposta.ok || !json.ok) throw new Error(json.erro || "falha");
      setLista(Array.isArray(json.pendentes) ? json.pendentes : []);
      setEnviadas(Number(json.enviadas) || 0);
      setDescartadas(Number(json.descartadas) || 0);
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

  async function marcar(id: string, acao: "enviado" | "descartar") {
    if (acao === "descartar" && !window.confirm("Descartar esta cesta? Ela sai da lista e o nome e o telefone são apagados.")) return;
    setSalvando(id);
    setAviso("");
    try {
      const resposta = await fetch("/api/interno/cestas-esquecidas", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, acao }) });
      if (!resposta.ok) throw new Error("falha");
      setAviso(acao === "enviado" ? "Marcado como enviado." : "Cesta descartada.");
      await carregar();
    } catch {
      setErro("Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="pvendas-pagina precompra">
      <header className="pvendas-cabeca">
        <div>
          <p className="pvendas-eyebrow">Área da equipe</p>
          {nivel === 2 ? <h2>Cestas esquecidas</h2> : <h1>Cestas esquecidas</h1>}
          <p className="pvendas-lead">Clientes que pediram para serem avisados se não terminassem o pedido. A cesta só aparece depois de 2 horas sem fechar. Medicamento nunca entra.</p>
        </div>
        <button className="pvendas-atualizar" type="button" onClick={() => void carregar()} disabled={carregando}>Atualizar</button>
      </header>

      <p className="pvendas-nota">Toque em <strong>Abrir WhatsApp</strong>, confira a mensagem e envie você mesmo. Cada cesta recebe um aviso só: depois marque <strong>Enviado</strong>. Se não for o caso, use <strong>Descartar</strong>.</p>
      {erro ? <p className="pvendas-erro" role="alert">{erro}</p> : null}
      {aviso ? <p className="pvendas-aviso" role="status">{aviso}</p> : null}

      <section className="pvendas-indicadores" aria-label="Resumo">
        <article><span>Para avisar</span><strong>{lista.length}</strong><small>cestas com consentimento</small></article>
        <article><span>Já enviados</span><strong>{enviadas}</strong><small>nos últimos 7 dias</small></article>
        <article><span>Descartadas</span><strong>{descartadas}</strong><small>nos últimos 7 dias</small></article>
      </section>

      <section className="pvendas-lista" aria-labelledby="cestas-lista">
        <h2 id="cestas-lista" className="precompra-titulo">Para avisar</h2>
        {carregando && lista.length === 0 ? <p className="pvendas-vazio">Carregando…</p> : lista.length === 0 ? (
          <div className="pvendas-vazio"><strong>Nenhuma cesta esquecida agora.</strong><span>Entram aqui só clientes que marcaram a caixa no checkout e deixaram a cesta aberta por pelo menos 2 horas.</span></div>
        ) : (
          <div className="pvendas-cartoes">
            {lista.map((c) => (
              <article className="pvenda-card precompra-card" key={c.id}>
                <header className="pvenda-topo">
                  <div><strong className="precompra-nome">{c.nome}</strong><span className="precompra-tel">{telefoneBonito(c.telefone)}</span></div>
                  <span className="pvenda-status">há {c.horasDesde} {c.horasDesde === 1 ? "hora" : "horas"}</span>
                </header>
                <p className="pvenda-loja">Cesta de {dataHora(c.atualizadoEm)}</p>
                <ul className="pvenda-itens">{c.produtos.map((p) => <li key={p}><span>{p}</span></li>)}</ul>
                <p className="precompra-msg">{c.mensagem}</p>
                <div className="precompra-acoes">
                  <a className="precompra-whats" href={c.link} target="_blank" rel="noreferrer" onClick={() => setAbertos((s) => new Set(s).add(c.id))}>Abrir WhatsApp</a>
                  <button type="button" className="precompra-enviado" disabled={salvando === c.id} onClick={() => void marcar(c.id, "enviado")}>{abertos.has(c.id) ? "Marcar enviado ✓" : "Marcar enviado"}</button>
                  <button type="button" className="precompra-sair" disabled={salvando === c.id} onClick={() => void marcar(c.id, "descartar")}>Descartar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
