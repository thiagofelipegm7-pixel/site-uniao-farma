"use client";

import { useCallback, useEffect, useState } from "react";
import "./entregas.css";

type Provedor = "lalamove" | "uber";
type Escolha = Provedor | "ambos";
type Entregador = { id: string; nome: string | null; telefone: string | null; placa: string | null; veiculo?: string | null };
type Entrega = {
  id: string;
  provedor?: Provedor;
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
  prazoMin?: number | null;
  previsaoEntrega?: string | null;
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
type InfoProvedor = { configurado: boolean; sandbox: boolean };
type Estado = {
  provedores: Record<Provedor, InfoProvedor>;
  coleta: { nome: string; endereco: string } | null;
  entregas: Entrega[];
  preVenda: { id: string; codigo: string; modo: string } | null;
};

// Situações da Lalamove em MAIÚSCULAS e do Uber Direct em minúsculas: não se misturam.
const STATUS: Record<string, string> = {
  cotada: "Cotada",
  ASSIGNING_DRIVER: "Procurando entregador",
  ON_GOING: "Entregador a caminho da loja",
  PICKED_UP: "Saiu para entrega",
  COMPLETED: "Entregue",
  CANCELED: "Cancelada",
  REJECTED: "Recusada pelos entregadores",
  EXPIRED: "Expirou sem entregador",
  pending: "Procurando entregador",
  pickup: "Entregador a caminho da loja",
  pickup_complete: "Saiu para entrega",
  dropoff: "A caminho do cliente",
  delivered: "Entregue",
  canceled: "Cancelada",
  returned: "Devolvida à loja",
};
const PODE_CANCELAR = new Set(["ASSIGNING_DRIVER", "ON_GOING", "pending", "pickup"]);
const ENCERRADA = new Set(["COMPLETED", "CANCELED", "REJECTED", "EXPIRED", "delivered", "canceled", "returned"]);
const NOME: Record<Provedor, string> = { lalamove: "Lalamove", uber: "Uber Direct" };
const CURTO: Record<Provedor, string> = { lalamove: "Lalamove", uber: "Uber" };
const NAO_CONFIGURADA: Record<Provedor, string> = { lalamove: "Integração Lalamove não configurada", uber: "Integração Uber Direct não configurada" };
const SEM_PROVEDOR: InfoProvedor = { configurado: false, sandbox: false };
const provedorDe = (e: Entrega): Provedor => (e.provedor === "uber" ? "uber" : "lalamove");

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
const prazo = (e: Entrega, rotulo: Provedor) =>
  e.prazoMin
    ? `Cerca de ${e.prazoMin} min${e.previsaoEntrega ? ` (entrega prevista às ${hora(e.previsaoEntrega)})` : ""}`
    : `A ${NOME[rotulo]} não informa na cotação. O andamento aparece depois que um entregador aceitar.`;
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
  const dados = (await resposta.json().catch(() => ({}))) as Resposta;
  if (!resposta.ok || !dados.ok || !dados.entrega) throw new Error(dados.mensagem || "Não foi possível concluir agora. Tente de novo.");
  return dados as Resposta & { entrega: Entrega };
}
type Resposta = { ok?: boolean; mensagem?: string; entrega?: Entrega; cotacoes?: Entrega[]; falhas?: Array<{ provedor: Provedor; mensagem: string }> };

export default function PainelEntregas() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [cotacoes, setCotacoes] = useState<Entrega[]>([]);
  const [falhasCotacao, setFalhasCotacao] = useState<Array<{ provedor: Provedor; mensagem: string }>>([]);
  const [escolhida, setEscolhida] = useState<string | null>(null);
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
      const dados = (await resposta.json()) as Partial<Estado> & { ok?: boolean; erro?: string; configurado?: boolean; sandbox?: boolean };
      const provedores = {
        lalamove: dados.provedores?.lalamove ?? { configurado: Boolean(dados.configurado), sandbox: Boolean(dados.sandbox) },
        uber: dados.provedores?.uber ?? SEM_PROVEDOR,
      };
      setEstado({ provedores, coleta: dados.coleta ?? null, entregas: dados.entregas ?? [], preVenda: dados.preVenda ?? null });
      setErroCarga(dados.ok ? "" : dados.erro === "sem_banco" ? "O banco não está disponível agora. A lista de entregas não carregou." : "Não foi possível carregar as entregas.");
    } catch {
      setErroCarga("Não foi possível carregar agora. Confira a conexão e tente de novo.");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void carregar(), 0);
    return () => window.clearTimeout(t);
  }, [carregar]);

  // Relógio para avisar quando a cotação vence (Lalamove e Uber dão alguns minutos de validade).
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const t = window.setTimeout(tique, 0);
    const i = window.setInterval(tique, 15_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, [cotacoes]);

  const info = (p: Provedor) => estado?.provedores[p] ?? SEM_PROVEDOR;
  const algumConfigurado = info("lalamove").configurado || info("uber").configurado;
  const ambosConfigurados = info("lalamove").configurado && info("uber").configurado;
  // Padrão: comparar as duas quando as duas estão ligadas; senão, a que estiver ligada.
  const padrao: Escolha = ambosConfigurados ? "ambos" : info("uber").configurado ? "uber" : "lalamove";
  const escolhaAtual: Escolha = escolha && (escolha === "ambos" ? ambosConfigurados : info(escolha).configurado) ? escolha : padrao;
  const podeCotar = escolhaAtual === "ambos" ? ambosConfigurados : info(escolhaAtual).configurado;
  const preVenda = estado?.preVenda ?? null;
  const cotacao = cotacoes.find((c) => c.id === escolhida) ?? null;
  const limparCotacao = () => {
    setCotacoes([]);
    setFalhasCotacao([]);
    setEscolhida(null);
  };

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
      limparCotacao();
      const dados = await enviar({ acao: "cotar", provedor: escolhaAtual, endereco, complemento, lat: lat.trim(), lng: lng.trim(), preVendaId: preVenda?.id, codigo: preVenda?.codigo });
      const lista = dados.cotacoes?.length ? dados.cotacoes : [dados.entrega];
      setCotacoes(lista);
      setFalhasCotacao(dados.falhas ?? []);
      // Deixa marcada a mais barata; o atendente pode trocar antes de chamar.
      const valor = (c: Entrega) => (c.precoTotal && Number.isFinite(Number(c.precoTotal)) ? Number(c.precoTotal) : Infinity);
      setEscolhida([...lista].sort((a, b) => valor(a) - valor(b))[0].id);
    });

  const chamar = () =>
    executar("chamar", async () => {
      if (!cotacao) return;
      const { entrega } = await enviar({ acao: "chamar", id: cotacao.id, nome, telefone });
      limparCotacao();
      setEndereco("");
      setComplemento("");
      setLat("");
      setLng("");
      setNome("");
      setTelefone("");
      setAviso(`Entregador chamado. Pedido ${CURTO[provedorDe(entrega)]} ${entrega.orderId}.`);
      setEstado((e) => (e ? { ...e, entregas: [entrega, ...e.entregas.filter((x) => x.id !== entrega.id)] } : e));
    });

  const agir = (entrega: Entrega, acao: "atualizar" | "cancelar") =>
    executar(`${acao}-${entrega.id}`, async () => {
      const nomeProvedor = provedorDe(entrega) === "uber" ? "no Uber" : "na Lalamove";
      if (acao === "cancelar" && !window.confirm(`Cancelar esta entrega ${nomeProvedor}?`)) return;
      const { entrega: nova } = await enviar({ acao, id: entrega.id });
      setEstado((e) => (e ? { ...e, entregas: e.entregas.map((x) => (x.id === nova.id ? nova : x)) } : e));
      setAviso(acao === "cancelar" ? `Entrega cancelada ${nomeProvedor}.` : `Status atualizado: ${STATUS[nova.status] || nova.status}.`);
    });

  const vencida = (c: Entrega) => (agora > 0 && c.cotacaoExpiraEm ? Date.parse(c.cotacaoExpiraEm) < agora : false);
  const expirada = cotacao ? vencida(cotacao) : false;
  const testes = (["lalamove", "uber"] as Provedor[]).filter((p) => info(p).configurado && info(p).sandbox);

  return (
    <div className="entregas-pagina">
      <header className="entregas-cabeca">
        <div>
          <p className="entregas-eyebrow">Entregas · Lalamove e Uber Direct</p>
          <h1>Chamar entregador</h1>
          <p className="entregas-lead">Cote e chame um entregador da Lalamove (LalaGo) ou do Uber Direct saindo da loja {estado?.coleta?.endereco ?? "Rua Inglaterra, 162, Nações Unidas"}.</p>
        </div>
        {testes.length ? (
          <span className="entregas-selos">
            {testes.map((p) => (
              <span key={p} className="entregas-teste" role="status">{p === "lalamove" ? "LALAMOVE: MODO TESTE (sandbox)" : "UBER: MODO TESTE"}</span>
            ))}
          </span>
        ) : null}
      </header>

      {estado
        ? (["lalamove", "uber"] as Provedor[]).filter((p) => !info(p).configurado).map((p) => (
            <p key={p} className="entregas-erro" role="alert">
              <strong>{NAO_CONFIGURADA[p]}.</strong> {p === "lalamove" ? "Os botões da Lalamove ficam desligados até a chave da Lalamove ser cadastrada no servidor." : "O Uber fica desligado até as credenciais do Uber Direct serem cadastradas no servidor."}
            </p>
          ))
        : null}
      {testes.length ? (
        <p className="entregas-nota">
          Ambiente de teste {testes.map((p) => (p === "lalamove" ? "da Lalamove" : "do Uber Direct")).join(" e ")}: nenhum entregador de verdade é chamado e nada é cobrado.
          {testes.includes("uber") ? " No Uber, um entregador simulado aceita e anda com o pedido sozinho." : ""}
        </p>
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
            <fieldset className="entregas-provedores">
              <legend>Cotar com</legend>
              {([
                ["ambos", "Comparar as duas", ambosConfigurados],
                ["lalamove", "Lalamove", info("lalamove").configurado],
                ["uber", "Uber Direct", info("uber").configurado],
              ] as Array<[Escolha, string, boolean]>).map(([valor, rotulo, ligado]) => (
                <label key={valor} className={ligado ? undefined : "entregas-desligado"}>
                  <input type="radio" name="provedor" value={valor} checked={escolhaAtual === valor} disabled={!ligado} onChange={() => { setEscolha(valor); limparCotacao(); }} />
                  <span>{rotulo}</span>
                </label>
              ))}
            </fieldset>
            <label>
              <span>Endereço do cliente</span>
              <input value={endereco} onChange={(e) => { setEndereco(e.target.value); limparCotacao(); }} placeholder="Rua, número, bairro" autoComplete="off" required minLength={6} />
            </label>
            <label>
              <span>Complemento e referência <small>(opcional)</small></span>
              <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, bloco, ponto de referência" autoComplete="off" />
            </label>
            <details className="entregas-ponto">
              <summary>Corrigir o ponto no mapa</summary>
              <p>Se o endereço for localizado no lugar errado, cole a latitude e a longitude certas (do Google Maps ou do OpenStreetMap).</p>
              <div>
                <label><span>Latitude</span><input value={lat} onChange={(e) => { setLat(e.target.value); limparCotacao(); }} inputMode="decimal" placeholder="-19.88" /></label>
                <label><span>Longitude</span><input value={lng} onChange={(e) => { setLng(e.target.value); limparCotacao(); }} inputMode="decimal" placeholder="-43.86" /></label>
              </div>
            </details>
            <button type="submit" className="entregas-botao" disabled={!podeCotar || ocupado !== null || endereco.trim().length < 6} title={algumConfigurado ? undefined : NAO_CONFIGURADA.lalamove}>
              {ocupado === "cotar" ? "Cotando…" : escolhaAtual === "ambos" ? "Cotar nas duas" : "Cotar entrega"}
            </button>
          </form>

          {cotacoes.length ? (
            <div className="entregas-cotacao" aria-live="polite">
              {cotacoes.length > 1 ? <p className="entregas-dica">Escolha por qual chamar. A mais barata já vem marcada.</p> : null}
              <div className="entregas-opcoes" role={cotacoes.length > 1 ? "radiogroup" : undefined} aria-label={cotacoes.length > 1 ? "Cotações" : undefined}>
                {cotacoes.map((c) => {
                  const p = provedorDe(c);
                  const marcada = c.id === escolhida;
                  return (
                    <div key={c.id} className={`entregas-opcao${marcada ? " entregas-opcao-marcada" : ""}`}>
                      <label className="entregas-preco">
                        {cotacoes.length > 1 ? <input type="radio" name="cotacao" checked={marcada} onChange={() => setEscolhida(c.id)} /> : null}
                        <span>Preço {p === "uber" ? "do Uber Direct" : "da Lalamove"}</span>
                        <strong>{preco(c.precoTotal, c.moeda)}</strong>
                      </label>
                      <dl>
                        <div><dt>Prazo</dt><dd>{prazo(c, p)}</dd></div>
                        <div><dt>Cotação vale até</dt><dd>{hora(c.cotacaoExpiraEm)}{vencida(c) ? " (venceu)" : ""}</dd></div>
                        {c.distanciaM != null ? <div><dt>Distância</dt><dd>{km(c.distanciaM)}</dd></div> : null}
                      </dl>
                    </div>
                  );
                })}
              </div>
              {falhasCotacao.map((f) => (
                <p key={f.provedor} className="entregas-erro">{NOME[f.provedor]}: {f.mensagem}</p>
              ))}
              {cotacao ? (
                <>
                  <dl>
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
                    <button type="submit" className="entregas-botao entregas-botao-forte" disabled={!info(provedorDe(cotacao)).configurado || ocupado !== null || expirada || nome.trim().length < 2 || telefone.replace(/\D/g, "").length < 10}>
                      {ocupado === "chamar" ? "Chamando…" : cotacoes.length > 1 ? `Chamar entregador (${CURTO[provedorDe(cotacao)]})` : "Chamar entregador"}
                    </button>
                  </form>
                </>
              ) : null}
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
              {estado.entregas.map((ent) => {
                const p = provedorDe(ent);
                const ligado = info(p).configurado;
                return (
                  <li key={ent.id} className="entregas-item">
                    <header>
                      <div>
                        <strong>{ent.clienteNome || "Cliente"}{ent.codigo ? ` · ${ent.codigo}` : ""}</strong>
                        <time dateTime={ent.criadoEm}>{dataHora(ent.criadoEm)}</time>
                      </div>
                      <span className="entregas-etiquetas">
                        <span className={`entregas-provedor entregas-provedor-${p}`}>{CURTO[p]}</span>
                        <span className={`entregas-status entregas-status-${ent.status.toLowerCase()}`}>{STATUS[ent.status] || ent.status}</span>
                      </span>
                    </header>
                    <p className="entregas-end">{ent.endereco}{ent.complemento ? ` (${ent.complemento})` : ""}</p>
                    <dl>
                      <div><dt>Pedido {CURTO[p]}</dt><dd>{ent.orderId}{ent.sandbox ? " · teste" : ""}</dd></div>
                      <div><dt>Preço</dt><dd>{preco(ent.precoTotal, ent.moeda)}</dd></div>
                      <div>
                        <dt>Entregador</dt>
                        <dd>
                          {ent.entregador?.nome ? (
                            <>
                              {ent.entregador.nome}
                              {ent.entregador.veiculo ? ` · ${ent.entregador.veiculo}` : ""}
                              {ent.entregador.placa ? ` · placa ${ent.entregador.placa}` : ""}
                              {ent.entregador.telefone ? <> · <a href={`tel:${ent.entregador.telefone}`}>{ent.entregador.telefone}</a></> : null}
                            </>
                          ) : ENCERRADA.has(ent.status) ? "—" : "Aguardando um entregador aceitar"}
                        </dd>
                      </div>
                      <div><dt>Atualizado</dt><dd>{dataHora(ent.atualizadoEm)}</dd></div>
                    </dl>
                    <footer>
                      {ent.shareLink ? <a className="entregas-link" href={ent.shareLink} target="_blank" rel="noreferrer">{p === "uber" ? "Acompanhar no Uber" : "Acompanhar na Lalamove"}</a> : null}
                      <span className="entregas-acoes">
                        <button type="button" className="entregas-botao entregas-botao-claro" onClick={() => void agir(ent, "atualizar")} disabled={!ligado || ocupado !== null}>
                          {ocupado === `atualizar-${ent.id}` ? "Atualizando…" : "Atualizar status"}
                        </button>
                        {PODE_CANCELAR.has(ent.status) ? (
                          <button type="button" className="entregas-botao entregas-botao-perigo" onClick={() => void agir(ent, "cancelar")} disabled={!ligado || ocupado !== null}>
                            {ocupado === `cancelar-${ent.id}` ? "Cancelando…" : "Cancelar"}
                          </button>
                        ) : null}
                      </span>
                    </footer>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
