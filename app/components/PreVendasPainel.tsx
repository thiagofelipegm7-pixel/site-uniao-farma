"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./pre-vendas.css";

type Status = "nova" | "atendimento" | "concluida" | "cancelada";
type ItemPreVenda = { nome: string; quantidade: number; precoCentavos: number };
type PreVenda = {
  id: string;
  codigo: string;
  unidade: string;
  modo: "retirar" | "casa";
  itens: ItemPreVenda[];
  totalCentavos: number;
  status: Status;
  criadoEm: string;
};

const STATUS: Record<Status, string> = {
  nova: "Nova",
  atendimento: "Em atendimento",
  concluida: "Venda concluída",
  cancelada: "Não fechou",
};
const UNIDADE: Record<string, string> = {
  fatima: "Nossa Senhora de Fátima",
  nacoes: "Nações Unidas",
  itacolomi: "Itacolomi",
};
const dinheiro = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (texto: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(texto));

export default function PreVendasPainel() {
  const [registros, setRegistros] = useState<PreVenda[]>([]);
  const [faixa, setFaixa] = useState<7 | 30 | 90>(30);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/interno/pre-vendas", { cache: "no-store" });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent("/interno/pre-vendas")}`);
        return;
      }
      const dados = (await resposta.json()) as { ok?: boolean; erro?: string; preVendas?: PreVenda[] };
      if (!resposta.ok || !dados.ok) throw new Error(dados.erro || "Não foi possível carregar as pré-vendas.");
      setRegistros(Array.isArray(dados.preVendas) ? dados.preVendas : []);
      setAgora(Date.now());
      setErro("");
    } catch (falha) {
      setErro(falha instanceof Error && falha.message === "sem_banco" ? "O banco local não está disponível. As pré-vendas só aparecem depois que a conexão com o banco estiver ativa." : "Não foi possível carregar agora. Confira a conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const inicio = window.setTimeout(() => void carregar(), 0);
    const intervalo = window.setInterval(() => void carregar(), 60_000);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(intervalo);
    };
  }, [carregar]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return registros.filter((registro) => {
      const idade = agora - Date.parse(registro.criadoEm);
      if (!Number.isFinite(idade) || idade > faixa * 86_400_000) return false;
      if (!termo) return true;
      return registro.codigo.toLocaleLowerCase("pt-BR").includes(termo) || registro.itens.some((item) => item.nome.toLocaleLowerCase("pt-BR").includes(termo));
    });
  }, [agora, busca, faixa, registros]);

  const abertas = visiveis.filter((registro) => registro.status === "nova" || registro.status === "atendimento");
  const estimativaAberta = abertas.reduce((soma, registro) => soma + registro.totalCentavos, 0);
  const unidadesAbertas = abertas.reduce((soma, registro) => soma + registro.itens.reduce((sub, item) => sub + item.quantidade, 0), 0);

  async function alterarStatus(id: string, status: Status) {
    setSalvando(id);
    setAviso("");
    try {
      const resposta = await fetch("/api/interno/pre-vendas", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (resposta.redirected || (resposta.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign(`/interno/entrar?next=${encodeURIComponent("/interno/pre-vendas")}`);
        return;
      }
      if (!resposta.ok) throw new Error("Não foi possível atualizar o andamento.");
      setAviso("Andamento atualizado.");
      await carregar();
    } catch {
      setErro("Não foi possível atualizar o andamento. Tente novamente.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="pvendas-pagina">
      <header className="pvendas-cabeca">
        <div>
          <p className="pvendas-eyebrow">Área da equipe</p>
          <h1>Pré-vendas do site</h1>
          <p className="pvendas-lead">Acompanhe as cestas que chegaram até a abertura do WhatsApp e atualize o andamento da conversa.</p>
        </div>
        <button className="pvendas-atualizar" type="button" onClick={() => void carregar()} disabled={carregando}>Atualizar</button>
      </header>

      <p className="pvendas-nota">Cada registro significa que o cliente clicou para abrir o WhatsApp. Isso não confirma o envio da mensagem nem a venda. Nome, telefone, endereço e forma de pagamento não são guardados, a não ser nome e celular de quem marcou a caixa de lembrete de recompra (veja Recompra).</p>
      {erro ? <p className="pvendas-erro" role="alert">{erro}</p> : null}
      {aviso ? <p className="pvendas-aviso" role="status">{aviso}</p> : null}

      <section className="pvendas-indicadores" aria-label="Resumo das pré-vendas">
        <article><span>Em aberto</span><strong>{abertas.length}</strong><small>novas ou em atendimento</small></article>
        <article><span>Valor estimado em aberto</span><strong>{dinheiro(estimativaAberta)}</strong><small>não representa venda confirmada</small></article>
        <article><span>Unidades de produtos</span><strong>{unidadesAbertas}</strong><small>nas pré-vendas em aberto</small></article>
      </section>

      <section className="pvendas-lista" aria-labelledby="pvendas-lista-titulo">
        <div className="pvendas-filtros">
          <h2 id="pvendas-lista-titulo">Cestas iniciadas</h2>
          <label className="pvendas-busca"><span className="pvendas-sr">Buscar por código ou produto</span><input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Código ou produto" /></label>
          <label className="pvendas-periodo"><span>Período</span><select value={faixa} onChange={(event) => setFaixa(Number(event.target.value) as 7 | 30 | 90)}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option></select></label>
        </div>

        {carregando ? <p className="pvendas-vazio">Carregando pré-vendas…</p> : visiveis.length === 0 ? (
          <div className="pvendas-vazio"><strong>Nenhuma pré-venda neste período.</strong><span>Os registros começam quando alguém finaliza a cesta e clica para abrir o WhatsApp.</span></div>
        ) : (
          <div className="pvendas-cartoes">
            {visiveis.map((registro) => (
              <article className="pvenda-card" key={registro.id}>
                <header className="pvenda-topo">
                  <div><span className="pvenda-codigo">#{registro.codigo}</span><time dateTime={registro.criadoEm}>{dataHora(registro.criadoEm)}</time></div>
                  <span className={`pvenda-status pvenda-status-${registro.status}`}>{STATUS[registro.status]}</span>
                </header>
                <p className="pvenda-loja">{UNIDADE[registro.unidade] || registro.unidade} <span>·</span> {registro.modo === "casa" ? "Entrega" : "Retirada"}</p>
                <ul className="pvenda-itens">
                  {registro.itens.slice(0, 5).map((item, index) => <li key={`${item.nome}-${index}`}><span>{item.quantidade}× {item.nome}</span><b>{dinheiro(item.precoCentavos * item.quantidade)}</b></li>)}
                  {registro.itens.length > 5 ? <li className="pvenda-mais-itens">+ {registro.itens.length - 5} outros produtos</li> : null}
                </ul>
                <footer className="pvenda-rodape">
                  <span>Estimativa <strong>{dinheiro(registro.totalCentavos)}</strong></span>
                  <label><span className="pvendas-sr">Atualizar andamento</span><select value={registro.status} disabled={salvando === registro.id} onChange={(event) => void alterarStatus(registro.id, event.target.value as Status)}>{Object.entries(STATUS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>
                </footer>
                {registro.modo === "casa" && (registro.status === "nova" || registro.status === "atendimento") ? (
                  <a className="pvenda-entregador" href={`/interno/entregas?pv=${encodeURIComponent(registro.id)}`}>Chamar entregador</a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
