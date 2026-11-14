"use client";

import { useEffect, useState } from "react";

type Item = { original: string; exibicao: string; descricao: string; marca: string; fontes?: string };

/**
 * Fila de revisão das sugestões da IA (descrição e marca). A IA só propõe: nada vale para o cliente até a equipe aprovar aqui.
 * Aprovar salva pelas mesmas rotas do painel (com histórico de quem e quando); descartar tira da fila e a IA não volta ao produto.
 */
export default function FilaIA({ por, onAviso, onDescricaoSalva }: { por: string; onAviso: (texto: string) => void; onDescricaoSalva: (original: string, texto: string) => void }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [iaLigada, setIaLigada] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState("");
  const [editados, setEditados] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [palavras, setPalavras] = useState<{ comPalavras: number; faltam: number } | null>(null);
  const [gerandoPalavras, setGerandoPalavras] = useState(false);
  const [msgPalavras, setMsgPalavras] = useState("");

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [f, st, pl] = await Promise.all([fetch("/api/interno/ia/fila", { cache: "no-store" }), fetch("/api/interno/ia/lote", { cache: "no-store" }), fetch("/api/interno/ia/palavras", { cache: "no-store" })]);
        const pj = (await pl.json().catch(() => null)) as { ok?: boolean; comPalavras?: number; faltam?: number } | null;
        if (vivo && pj?.ok) setPalavras({ comPalavras: pj.comPalavras ?? 0, faltam: pj.faltam ?? 0 });
        const fj = (await f.json().catch(() => null)) as { ok?: boolean; itens?: Item[] } | null;
        const sj = (await st.json().catch(() => null)) as { ok?: boolean; restantes?: number; ia?: boolean } | null;
        if (!vivo) return;
        if (fj?.ok && fj.itens) setItens(fj.itens);
        if (sj?.ok) {
          setRestantes(sj.restantes ?? 0);
          setIaLigada(sj.ia !== false);
        }
      } catch {
        // sem conexão: a fila aparece vazia
      }
    })();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  async function gerar(refazer = false) {
    setGerando(true);
    setMsg("");
    try {
      const r = await fetch("/api/interno/ia/lote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantidade: 10, refazer }), signal: AbortSignal.timeout(170_000) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string; geradas?: number; semSugestao?: number; falhas?: number; motivo?: string } | null;
      if (!r.ok || !j?.ok) {
        setMsg(j?.erro === "sem_ia" ? "A IA ainda não está ligada (falta a chave do Gemini)." : j?.erro === "limite" ? "Muitos lotes seguidos. Espere alguns minutos." : "Não consegui gerar agora. Tente de novo.");
      } else {
        setMsg(`${j.geradas ?? 0} sugestões novas${j.semSugestao ? `, ${j.semSugestao} produtos sem sugestão segura` : ""}${j.falhas ? `, ${j.falhas} falharam (${j.motivo ?? "erro"})` : ""}.`);
      }
    } catch {
      setMsg("Demorou demais ou a conexão caiu. Veja se as sugestões apareceram na lista.");
    }
    setGerando(false);
    setRecarga((n) => n + 1);
  }

  async function gerarPalavras() {
    setGerandoPalavras(true);
    setMsgPalavras("");
    try {
      const r = await fetch("/api/interno/ia/palavras", { method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(170_000) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string; salvos?: number; semPalavras?: number; falhas?: number; motivo?: string } | null;
      if (!r.ok || !j?.ok) setMsgPalavras(j?.erro === "sem_ia" ? "A IA ainda não está ligada (falta a chave do Gemini)." : j?.erro === "limite" ? "Muitos pedidos seguidos. Espere alguns minutos." : "Não consegui gerar agora. Tente de novo.");
      else setMsgPalavras(`${j.salvos ?? 0} produtos ganharam palavras de busca${j.semPalavras ? `, ${j.semPalavras} sem palavras seguras` : ""}${j.falhas ? `, ${j.falhas} falharam (${j.motivo ?? "erro"})` : ""}. Valem na próxima publicação.`);
    } catch {
      setMsgPalavras("Demorou demais ou a conexão caiu. Atualize a página para ver o andamento.");
    }
    setGerandoPalavras(false);
    setRecarga((n) => n + 1);
  }

  async function tirar(original: string, estado: "aprovada" | "descartada") {
    await fetch("/api/interno/ia/fila", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ original, estado }) }).catch(() => null);
    setItens((l) => l.filter((i) => i.original !== original));
  }

  async function aprovar(i: Item) {
    const texto = (editados[i.original] ?? i.descricao).replace(/\s+/g, " ").trim();
    setOcupado(i.original);
    try {
      const r = await fetch("/api/interno/produto/descricao", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ original: i.original, texto, fonte: null, por: por.trim() }) });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        onAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        onAviso(j?.erro === "promessa" ? "O texto tem promessa de efeito ou de resultado. Edite antes de aprovar." : j?.erro === "tamanho" ? "A descrição precisa ter de 20 a 600 caracteres." : "Não consegui salvar. Edite o texto ou descarte.");
        return;
      }
      if (i.marca) await fetch("/api/interno/produto/marca", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ original: i.original, marca: i.marca, por: por.trim() }) }).catch(() => null);
      onDescricaoSalva(i.original, texto);
      await tirar(i.original, "aprovada");
      onAviso("Descrição aprovada e salva no histórico. Vale na próxima publicação (em alguns minutos).");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <details className="pf-mudancas pf-fila-ia">
      <summary>Sugestões da IA para revisar <b>({itens.length})</b>{restantes !== null ? <span className="pf-dica"> · {restantes} produtos ainda sem descrição</span> : null}</summary>
      <p className="pf-dica">A IA só propõe. Nada vai para o cliente até você aprovar. Leia com atenção: só fatos do produto, sem promessa de efeito.</p>
      <div className="pf-modal-acoes">
        <button type="button" className="pf-botao pf-botao--primario" disabled={gerando || !iaLigada || restantes === 0} onClick={() => void gerar()}>
          {gerando ? "Pesquisando… (pode levar 1 ou 2 minutos)" : "Gerar mais 10 sugestões"}
        </button>
        {itens.length > 0 ? <button type="button" className="pf-botao" disabled={gerando || !iaLigada} onClick={() => void gerar(true)}>Refazer as pendentes com pesquisa</button> : null}
        {!iaLigada ? <span className="pf-dica">A IA ainda não está ligada (falta a chave do Gemini).</span> : null}
        {msg ? <span className="pf-dica" role="status">{msg}</span> : null}
      </div>
      <div className="pf-fila-palavras">
        <strong>Palavras de busca</strong>
        <p className="pf-dica">A IA escreve nomes populares e marcas para a busca achar o produto (ex.: &quot;aparelho de barbear&quot; para o Prestobarba). O cliente não vê essas palavras. Remédios ficam de fora. Você pode editar no popup de cada produto.</p>
        <div className="pf-modal-acoes">
          <button type="button" className="pf-botao pf-botao--primario" disabled={gerandoPalavras || !iaLigada || palavras?.faltam === 0} onClick={() => void gerarPalavras()}>
            {gerandoPalavras ? "Gerando… (1 a 2 minutos)" : "Gerar palavras para 60 produtos"}
          </button>
          {palavras ? <span className="pf-dica">{palavras.comPalavras} produtos já têm · {palavras.faltam} faltam</span> : null}
          {msgPalavras ? <span className="pf-dica" role="status">{msgPalavras}</span> : null}
        </div>
      </div>
      <ul className="pf-fila-lista">
        {itens.map((i) => (
          <li key={i.original} className="pf-fila-item">
            <strong>{i.exibicao}</strong>
            <textarea className="pf-entrada pf-area" rows={3} maxLength={600} aria-label={`Descrição sugerida para ${i.exibicao}`} value={editados[i.original] ?? i.descricao} onChange={(e) => setEditados((m) => ({ ...m, [i.original]: e.target.value }))} />
            {i.fontes ? <small className="pf-dica">Sites consultados pela IA: {i.fontes}. Confira antes de aprovar.</small> : null}
            {i.marca ? <small className="pf-dica">Marca sugerida: <b>{i.marca}</b> (preenchida junto ao aprovar)</small> : null}
            <div className="pf-modal-acoes">
              <button type="button" className="pf-botao pf-botao--primario" disabled={ocupado === i.original} onClick={() => void aprovar(i)}>Aprovar</button>
              <button type="button" className="pf-botao" disabled={ocupado === i.original} onClick={() => void tirar(i.original, "descartada")}>Descartar</button>
            </div>
          </li>
        ))}
      </ul>
      {itens.length === 0 ? <p className="pf-dica">Nenhuma sugestão esperando. Clique em &quot;Gerar mais 10 sugestões&quot;.</p> : null}
    </details>
  );
}
