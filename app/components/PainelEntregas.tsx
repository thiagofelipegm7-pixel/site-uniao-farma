"use client";

import { useCallback, useEffect, useState } from "react";
import "./entregas.css";

type Entregador = { id: string; nome: string | null; telefone: string | null; placa: string | null };
type Entrega = {
  id: string;
  preVendaId: string | null;
  codigo: string | null;
  endereco: string;
  complemento: string | null;
  encontrado: string | null;
  lat: number;
  lng: number;
  precoTotal: string | null;
  moeda: string | null;
  distanciaM: number | null;
  cotacaoExpiraEm: string | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  orderId: string | null;
  status: string;
  entregador: Entregador | null;
  shareLink: string | null;
  sandbox: boolean;
  criadoEm: string;
  atualizadoEm: string;
};
type Estado = {
  configurado: boolean;
  sandbox: boolean;
  coleta: { nome: string; endereco: string } | null;
  entregas: Entrega[];
  preVenda: { id: string; codigo: string; modo: string } | null;
};

const STATUS: Record<string, string> = {
  cotada: "Cotada",
  ASSIGNING_DRIVER: "Procurando entregador",
  ON_GOING: "Entregador a caminho da loja",
  PICKED_UP: "Saiu para entrega",
  COMPLETED: "Entregue",
  CANCELED: "Cancelada",
  REJECTED: "Recusada pelos entregadores",
  EXPIRED: "Expirou sem entregador",
};
const PODE_CANCELAR = new Set(["ASSIGNING_DRIVER", "ON_GOING"]);
const ENCERRADA = new Set(["COMPLETED", "CANCELED", "REJECTED", "EXPIRED"]);
const NAO_CONFIGURADA = "Integração Lalamove não configurada";

function preco(total: string | null, moeda: string | null) {
  if (!total) return "—";
  const valor = Number(total);
  if (!Number.isFinite(valor)) return `${total} ${moeda ?? ""}`.trim();
  try {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: moeda || "BRL" });
  } catch {
    return `${total} ${moeda ?? ""}`.trim();
  }
}
const hora = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "—";
const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const km = (m: number | null) => (m == null ? "—" : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);
const mapa = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

async function enviar(corpo: Record<string, unknown>) {
  const resposta = await fetch("/api/interno/entregas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
    window.location.assign(`/interno/entrar?next=${encodeURIComponent("/interno/entregas")}`);
    throw new Error("Sessão expirada. Entre de novo.");
  }
  const dados = (await resposta.json().catch(() => ({}))) as { ok?: boolean; mensagem?: string; entrega?: Entrega };
  if (!resposta.ok || !dados.ok || !dados.entrega) throw new Error(dados.mensagem || "Não foi possível concluir agora. Tente de novo.");
  return dados.entrega;
}

export default function PainelEntregas() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cotacao, setCotacao] = useState<Entrega | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const pv = new URLSearchParams(window.location.search).get("pv");
      const resposta = await fetch(`/api/interno/entregas${pv ? `?pv=${encodeURIComponent(pv)}` : ""}`, { cache: "no-store" });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent("/interno/entregas")}`);
        return;
      }
      const dados = (await resposta.json()) as Estado & { ok?: boolean; erro?: string };
      setEstado({ configurado: Boolean(dados.configurado), sandbox: Boolean(dados.sandbox), coleta: dados.coleta ?? null, entregas: dados.entregas ?? [], preVenda: dados.preVenda ?? null });
      setErroCarga(dados.ok ? "" : dados.erro === "sem_banco" ? "O banco não está disponível agora. A lista de entregas não carregou." : "Não foi possível carregar as entregas.");
    } catch {
      setErroCarga("Não foi possível carregar agora. Confira a conexão e tente de novo.");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(t);
  }, [carregar]);

  // Relógio para avisar quando a cotação vence (a Lalamove dá alguns minutos de validade).
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const t = window.setTimeout(tique, 0);
    const i = window.setInterval(tique, 15_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, [cotacao]);

  const configurado = Boolean(estado?.configurado);
  const preVenda = estado?.preVenda ?? null;

  async function executar(chave: string, acao: () => Promise<void>) {
    setOcupado(chave);
    setErro("");
    setAviso("");
    try {
      await acao();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir agora.");
    } finally {
      setOcupado(null);
    }
  }

  const cotar = () =>
    executar("cotar", async () => {
      const entrega = await enviar({ acao: "cotar", endereco, complemento, lat: lat.trim(), lng: lng.trim(), preVendaId: preVenda?.id, codigo: preVenda?.codigo });
      setCotacao(entrega);
    });

  const chamar = () =>
    executar("chamar", async () => {
      if (!cotacao) return;
      const entrega = await enviar({ acao: "chamar", id: cotacao.id, nome, telefone });
      setCotacao(null);
      setEndereco("");
      setComplemento("");
      setLat("");
      setLng("");
      setNome("");
      setTelefone("");
      setAviso(`Entregador chamado. Pedido Lalamove ${entrega.orderId}.`);
      setEstado((e) => (e ? { ...e, entregas: [entrega, ...e.entregas.filter((x) => x.id !== entrega.id)] } : e));
    });

  const agir = (entrega: Entrega, acao: "atualizar" | "cancelar") =>
    executar(`${acao}-${entrega.id}`, async () => {
      if (acao === "cancelar" && !window.confirm("Cancelar esta entrega na Lalamove?")) return;
      const nova = await enviar({ acao, id: entrega.id });
      setEstado((e) => (e ? { ...e, entregas: e.entregas.map((x) => (x.id === nova.id ? nova : x)) } : e));
      setAviso(acao === "cancelar" ? "Entrega cancelada na Lalamove." : `Status atualizado: ${STATUS[nova.status] || nova.status}.`);
    });

  const expirada = agora > 0 && cotacao?.cotacaoExpiraEm ? Date.parse(cotacao.cotacaoExpiraEm) < agora : false;

  return (
    <div className="entregas-pagina">
      <header className="entregas-cabeca">
        <div>
          <p className="entregas-eyebrow">Entregas · Lalamove</p>
          <h1>Chamar entregador</h1>
          <p className="entregas-lead">Cote e chame um motoboy da Lalamove (LalaGo) saindo da loja {estado?.coleta?.endereco ?? "Rua Inglaterra, 162, Nações Unidas"}.</p>
        </div>
        {estado?.sandbox ? <span className="entregas-teste" role="status">MODO TESTE (sandbox)</span> : null}
      </header>

      {estado && !configurado ? (
        <p className="entregas-erro" role="alert"><strong>{NAO_CONFIGURADA}.</strong> Os botões ficam desligados até a chave da Lalamove ser cadastrada no servidor.</p>
      ) : null}
      {estado?.sandbox && configurado ? (
        <p className="entregas-nota">Ambiente de teste da Lalamove: nenhum motoboy de verdade é chamado e nada é cobrado.</p>
      ) : null}
      {erroCarga ? <p className="entregas-erro" role="alert">{erroCarga}</p> : null}
      {erro ? <p className="entregas-erro" role="alert">{erro}</p> : null}
      {aviso ? <p className="entregas-aviso" role="status">{aviso}</p> : null}

      <div className="entregas-grade">
        <section className="entregas-cartao" aria-labelledby="ent-nova">
          <h2 id="ent-nova">Nova entrega</h2>
          {preVenda ? <p className="entregas-pv">Pré-venda do site <strong>{preVenda.codigo}</strong>. Confirme o endereço com o cliente no WhatsApp.</p> : null}
          <form
            className="entregas-form"
            onSubmit={(ev) => {
              ev.preventDefault();
              void cotar();
            }}
          >
            <label>
              <span>Endereço do cliente</span>
              <input value={endereco} onChange={(e) => { setEndereco(e.target.value); setCotacao(null); }} placeholder="Rua, número, bairro" autoComplete="off" required minLength={6} />
            </label>
            <label>
              <span>Complemento e referência <small>(opcional)</small></span>
              <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, bloco, ponto de referência" autoComplete="off" />
            </label>
            <details className="entregas-ponto">
              <summary>Corrigir o ponto no mapa</summary>
              <p>Se o endereço for localizado no lugar errado, cole a latitude e a longitude certas (do Google Maps ou do OpenStreetMap).</p>
              <div>
                <label><span>Latitude</span><input value={lat} onChange={(e) => { setLat(e.target.value); setCotacao(null); }} inputMode="decimal" placeholder="-19.88" /></label>
                <label><span>Longitude</span><input value={lng} onChange={(e) => { setLng(e.target.value); setCotacao(null); }} inputMode="decimal" placeholder="-43.86" /></label>
              </div>
            </details>
            <button type="submit" className="entregas-botao" disabled={!configurado || ocupado !== null || endereco.trim().length < 6} title={configurado ? undefined : NAO_CONFIGURADA}>
              {ocupado === "cotar" ? "Cotando…" : "Cotar entrega"}
            </button>
          </form>

          {cotacao ? (
            <div className="entregas-cotacao" aria-live="polite">
              <div className="entregas-preco">
                <span>Preço da Lalamove</span>
                <strong>{preco(cotacao.precoTotal, cotacao.moeda)}</strong>
              </div>
              <dl>
                <div><dt>Distância</dt><dd>{km(cotacao.distanciaM)}</dd></div>
                <div><dt>Cotação vale até</dt><dd>{hora(cotacao.cotacaoExpiraEm)}{expirada ? " (venceu)" : ""}</dd></div>
                <div><dt>Prazo</dt><dd>A Lalamove não informa na cotação. O andamento aparece depois que um entregador aceitar.</dd></div>
                <div className="entregas-largo"><dt>Endereço localizado</dt><dd>{cotacao.encontrado || cotacao.endereco} · <a href={mapa(cotacao.lat, cotacao.lng)} target="_blank" rel="noreferrer">ver no mapa</a></dd></div>
              </dl>
              <p className="entregas-dica">Ponto errado? Corrija o endereço ou o ponto no mapa e cote de novo.</p>
              <form
                className="entregas-form"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  void chamar();
                }}
              >
                <label><span>Nome de quem recebe</span><input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" required minLength={2} /></label>
                <label><span>Telefone de quem recebe</span><input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="(31) 99999-9999" autoComplete="off" required /></label>
                <button type="submit" className="entregas-botao entregas-botao-forte" disabled={!configurado || ocupado !== null || expirada || nome.trim().length < 2 || telefone.replace(/\D/g, "").length < 10}>
                  {ocupado === "chamar" ? "Chamando…" : "Chamar entregador"}
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section className="entregas-cartao" aria-labelledby="ent-lista">
          <div className="entregas-lista-topo">
            <h2 id="ent-lista">Entregas chamadas</h2>
            <button type="button" className="entregas-link" onClick={() => void carregar()} disabled={ocupado !== null}>Recarregar</button>
          </div>
          {!estado ? <p className="entregas-vazio">Carregando…</p> : estado.entregas.length === 0 ? (
            <p className="entregas-vazio">Nenhuma entrega chamada ainda.</p>
          ) : (
            <ul className="entregas-lista">
              {estado.entregas.map((ent) => (
                <li key={ent.id} className="entregas-item">
                  <header>
                    <div>
                      <strong>{ent.clienteNome || "Cliente"}{ent.codigo ? ` · ${ent.codigo}` : ""}</strong>
                      <time dateTime={ent.criadoEm}>{dataHora(ent.criadoEm)}</time>
                    </div>
                    <span className={`entregas-status entregas-status-${ent.status.toLowerCase()}`}>{STATUS[ent.status] || ent.status}</span>
                  </header>
                  <p className="entregas-end">{ent.endereco}{ent.complemento ? ` (${ent.complemento})` : ""}</p>
                  <dl>
                    <div><dt>Pedido Lalamove</dt><dd>{ent.orderId}{ent.sandbox ? " · teste" : ""}</dd></div>
                    <div><dt>Preço</dt><dd>{preco(ent.precoTotal, ent.moeda)}</dd></div>
                    <div>
                      <dt>Entregador</dt>
                      <dd>
                        {ent.entregador?.nome ? (
                          <>
                            {ent.entregador.nome}
                            {ent.entregador.placa ? ` · placa ${ent.entregador.placa}` : ""}
                            {ent.entregador.telefone ? <> · <a href={`tel:${ent.entregador.telefone}`}>{ent.entregador.telefone}</a></> : null}
                          </>
                        ) : ENCERRADA.has(ent.status) ? "—" : "Aguardando um entregador aceitar"}
                      </dd>
                    </div>
                    <div><dt>Atualizado</dt><dd>{dataHora(ent.atualizadoEm)}</dd></div>
                  </dl>
                  <footer>
                    {ent.shareLink ? <a className="entregas-link" href={ent.shareLink} target="_blank" rel="noreferrer">Acompanhar na Lalamove</a> : null}
                    <span className="entregas-acoes">
                      <button type="button" className="entregas-botao entregas-botao-claro" onClick={() => void agir(ent, "atualizar")} disabled={!configurado || ocupado !== null}>
                        {ocupado === `atualizar-${ent.id}` ? "Atualizando…" : "Atualizar status"}
                      </button>
                      {PODE_CANCELAR.has(ent.status) ? (
                        <button type="button" className="entregas-botao entregas-botao-perigo" onClick={() => void agir(ent, "cancelar")} disabled={!configurado || ocupado !== null}>
                          {ocupado === `cancelar-${ent.id}` ? "Cancelando…" : "Cancelar"}
                        </button>
                      ) : null}
                    </span>
                  </footer>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
