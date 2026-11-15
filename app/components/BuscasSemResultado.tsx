"use client";

import { useEffect, useState } from "react";

type Linha = { termo: string; total: number; vazia: number; ultimo: string };
type Sugestao = { termo: string; alternativas: { t: string; n: number }[] };

/**
 * O que as pessoas procuraram e o site não achou de primeira (últimos 30 dias). Anônimo: só o texto, a contagem e o dia.
 * "Sem resultado" = a busca ficou vazia; "resolvida" = o site corrigiu, mostrou parte ou perguntou "Você quis dizer".
 */
export default function BuscasSemResultado({ por, onAviso }: { por: string; onAviso: (texto: string) => void }) {
  const [itens, setItens] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [copiadoTeste, setCopiadoTeste] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [iaLigada, setIaLigada] = useState(true);
  const [escolhida, setEscolhida] = useState<Record<string, string>>({});
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [r, rs] = await Promise.all([fetch("/api/interno/buscas", { cache: "no-store" }), fetch("/api/interno/ia/sinonimos", { cache: "no-store" })]);
        const j = (await r.json().catch(() => null)) as { ok?: boolean; itens?: Linha[] } | null;
        const js = (await rs.json().catch(() => null)) as { ok?: boolean; itens?: Sugestao[]; ia?: boolean } | null;
        if (!vivo) return;
        if (js?.ok) {
          setSugestoes(js.itens ?? []);
          setIaLigada(js.ia !== false);
        }
        if (j?.ok && j.itens) setItens(j.itens);
        else setErro(true);
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  const vazias = (itens ?? []).filter((i) => i.vazia > 0);

  async function sugerir() {
    setGerando(true);
    setMsg("");
    try {
      const r = await fetch("/api/interno/ia/sinonimos", { method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(60_000) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string; motivo?: string; sugeridos?: number; semSugestao?: number } | null;
      if (!r.ok || !j?.ok) setMsg(j?.erro === "sem_ia" ? "A IA ainda não está ligada (falta a chave do Gemini)." : j?.erro === "limite" ? "Muitos pedidos seguidos. Espere alguns minutos." : `Não consegui gerar agora${j?.motivo ? ` (${j.motivo})` : ""}.`);
      else setMsg(j.sugeridos || j.semSugestao ? `${j.sugeridos ?? 0} sugestões novas, ${j.semSugestao ?? 0} buscas sem sinônimo seguro.` : "Nenhuma busca nova para analisar.");
    } catch {
      setMsg("Demorou demais. Atualize a página para ver se chegaram.");
    }
    setGerando(false);
    setRecarga((n) => n + 1);
  }

  async function decidir(s: Sugestao, estado: "aprovado" | "descartado") {
    const alternativa = escolhida[s.termo] ?? s.alternativas[0]?.t ?? "";
    try {
      const r = await fetch("/api/interno/ia/sinonimos/decidir", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ termo: s.termo, estado, alternativa, por: por.trim() }) });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        onAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; produtos?: number } | null;
      if (!r.ok || !j?.ok) {
        onAviso("Não consegui salvar este sinônimo. Tente de novo.");
        return;
      }
      setSugestoes((l) => l.filter((x) => x.termo !== s.termo));
      onAviso(estado === "aprovado" ? `Sinônimo aprovado: “${s.termo}” agora acha ${j.produtos ?? 0} produtos. Vale na próxima publicação (em alguns minutos).` : "Sugestão descartada.");
    } catch {
      onAviso("Sem conexão. Tente de novo.");
    }
  }

  /** Comando pronto para pôr as buscas que falharam no teste automático (peça ao desenvolvedor que rode). */
  async function copiarParaTeste() {
    try {
      await navigator.clipboard.writeText(`npm run busca:casos -- add ${(itens ?? []).slice(0, 60).map((i) => `"${i.termo}"`).join(" ")}`);
      setCopiadoTeste(true);
      window.setTimeout(() => setCopiadoTeste(false), 2500);
    } catch {
      setCopiadoTeste(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(vazias.map((i) => `${i.termo}\t${i.vazia}`).join("\n"));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <details className="pf-mudancas pf-buscas">
      <summary>Buscas sem resultado <b>({vazias.length})</b>{sugestoes.length > 0 ? <span className="pf-dica"> · {sugestoes.length} sugestões da IA</span> : null}{itens && itens.length > vazias.length ? <span className="pf-dica"> · {itens.length - vazias.length} resolvidas pelo site</span> : null}</summary>
      <p className="pf-dica">O que as pessoas procuraram nos últimos 30 dias e o site não achou. Anônimo: só o texto, a contagem e o dia. Use para pedir produtos, ajustar sinônimos e palavras de busca. Termos de saúde sensível e dados pessoais não são guardados.</p>
      {erro ? <p className="pf-dica">Não consegui carregar agora.</p> : null}
      <div className="pf-modal-acoes">
        <button type="button" className="pf-botao pf-botao--primario" disabled={gerando || !iaLigada || vazias.length === 0} onClick={() => void sugerir()}>
          {gerando ? "Pensando…" : "Sugerir sinônimos com IA"}
        </button>
        {msg ? <span className="pf-dica" role="status">{msg}</span> : null}
        {!iaLigada ? <span className="pf-dica">A IA ainda não está ligada (falta a chave do Gemini).</span> : null}
      </div>
      {sugestoes.length > 0 ? (
        <ul className="pf-fila-lista">
          {sugestoes.map((s) => (
            <li key={s.termo} className="pf-fila-item">
              <span>
                Quem busca <strong>“{s.termo}”</strong> provavelmente procura{" "}
                {s.alternativas.length > 1 ? (
                  <select className="pf-select" value={escolhida[s.termo] ?? s.alternativas[0].t} onChange={(e) => setEscolhida((m) => ({ ...m, [s.termo]: e.target.value }))} aria-label={`Alternativa para ${s.termo}`}>
                    {s.alternativas.map((a) => <option key={a.t} value={a.t}>{a.t} ({a.n} produtos)</option>)}
                  </select>
                ) : (
                  <strong>{s.alternativas[0]?.t} ({s.alternativas[0]?.n} produtos)</strong>
                )}
                .
              </span>
              <small className="pf-dica">Ao aprovar, a busca “{s.termo}” passa a achar esses produtos (vira palavra de busca deles). Remédios nunca entram.</small>
              <div className="pf-modal-acoes">
                <button type="button" className="pf-botao pf-botao--primario" onClick={() => void decidir(s, "aprovado")}>Aprovar</button>
                <button type="button" className="pf-botao" onClick={() => void decidir(s, "descartado")}>Descartar</button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {itens && vazias.length === 0 ? <p className="pf-dica">Nenhuma busca vazia ainda. Elas começam a aparecer depois que o site novo recebe visitas.</p> : null}
      {vazias.length > 0 ? (
        <>
          <div className="pf-modal-acoes">
            <button type="button" className="pf-botao" onClick={() => void copiar()}>{copiado ? "Copiado!" : "Copiar lista"}</button>
            <button type="button" className="pf-botao" onClick={() => void copiarParaTeste()} title="Copia o comando que põe estas buscas no teste automático da busca">{copiadoTeste ? "Copiado!" : "Copiar para o teste"}</button>
          </div>
          <ul className="pf-mudancas-lista">
            {vazias.map((i) => (
              <li key={i.termo}>
                <span className="pf-mudanca-tipo pf-mudanca-tipo--esgotou">{i.vazia}×</span>
                <span className="pf-mudanca-nome">{i.termo}</span>
                <span className="pf-mudanca-info">último: {`${i.ultimo.slice(8, 10)}/${i.ultimo.slice(5, 7)}`}{i.total > i.vazia ? ` · ${i.total - i.vazia}× resolvida` : ""}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </details>
  );
}
