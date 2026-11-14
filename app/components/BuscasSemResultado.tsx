"use client";

import { useEffect, useState } from "react";

type Linha = { termo: string; total: number; vazia: number; ultimo: string };

/**
 * O que as pessoas procuraram e o site não achou de primeira (últimos 30 dias). Anônimo: só o texto, a contagem e o dia.
 * "Sem resultado" = a busca ficou vazia; "resolvida" = o site corrigiu, mostrou parte ou perguntou "Você quis dizer".
 */
export default function BuscasSemResultado() {
  const [itens, setItens] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/interno/buscas", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as { ok?: boolean; itens?: Linha[] } | null;
        if (!vivo) return;
        if (j?.ok && j.itens) setItens(j.itens);
        else setErro(true);
      } catch {
        if (vivo) setErro(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const vazias = (itens ?? []).filter((i) => i.vazia > 0);

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
      <summary>Buscas sem resultado <b>({vazias.length})</b>{itens && itens.length > vazias.length ? <span className="pf-dica"> · {itens.length - vazias.length} resolvidas pelo site</span> : null}</summary>
      <p className="pf-dica">O que as pessoas procuraram nos últimos 30 dias e o site não achou. Anônimo: só o texto, a contagem e o dia. Use para pedir produtos, ajustar sinônimos e palavras de busca. Termos de saúde sensível e dados pessoais não são guardados.</p>
      {erro ? <p className="pf-dica">Não consegui carregar agora.</p> : null}
      {itens && vazias.length === 0 ? <p className="pf-dica">Nenhuma busca vazia ainda. Elas começam a aparecer depois que o site novo recebe visitas.</p> : null}
      {vazias.length > 0 ? (
        <>
          <div className="pf-modal-acoes">
            <button type="button" className="pf-botao" onClick={() => void copiar()}>{copiado ? "Copiado!" : "Copiar lista"}</button>
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
