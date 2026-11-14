"use client";

import { useEffect, useMemo, useState } from "react";
import { candidatosValidos, consultaValida, limparRespostaIA, type RespostaBuscaIA } from "../../busca-ia-nucleo";
import { analisarConsulta, candidatosParaIA, contarCasos, criarVocabulario, termosIAUteis } from "./busca-tolerante";

/** Espera máxima pela IA. Passou disso, a busca segue como está (sem erro na tela). */
const ESPERA_IA_MS = 3200;
/** Pausa depois da última tecla antes de chamar a IA. */
const PAUSA_DIGITACAO_MS = 600;
const PREFIXO_CACHE = "buscaIA:v3:";

export type BuscaTolerante =
  | { tipo: "nenhum"; procurando: boolean }
  /** Buscas alternativas que existem no catálogo; `rotulo` é o texto de "Mostrando resultados para: …". */
  | { tipo: "corrigida"; rotulo: string; consultas: string[]; procurando: false }
  /** Palavra parecida que pode ser outro produto: só pergunta "Você quis dizer…?", sem mostrar resultados. */
  | { tipo: "sugestao"; sugestao: string; procurando: false }
  /** Pedido de remédio para um problema de saúde: o site não indica produto, quem orienta é o farmacêutico. */
  | { tipo: "sintoma"; procurando: false };

type Entrada = {
  /** Texto de busca (sem acento, minúsculas) de cada produto. Null enquanto o catálogo ainda não carregou por inteiro. */
  textos: readonly string[] | null;
  consulta: string;
  /** Quantos produtos a busca exata já acha (sem filtros). Só com zero a correção entra em ação. */
  totalExato: number;
  /** Chamar a IA depois da correção local? Falso deixa só a correção local. */
  usarIA?: boolean;
};

function lerCache(chave: string): RespostaBuscaIA | null {
  try {
    const bruto = window.sessionStorage.getItem(PREFIXO_CACHE + chave);
    return bruto ? (JSON.parse(bruto) as RespostaBuscaIA) : null;
  } catch {
    return null;
  }
}

function guardarCache(chave: string, resposta: RespostaBuscaIA) {
  try {
    window.sessionStorage.setItem(PREFIXO_CACHE + chave, JSON.stringify(resposta));
  } catch {
    // armazenamento cheio ou bloqueado: tudo bem
  }
}

/**
 * Busca com tolerância a erro de escrita, em duas etapas (só quando a busca normal não achou nada):
 * 1) correção local, de graça e instantânea; 2) IA, só se a local não resolveu, escolhendo entre palavras que o catálogo tem.
 * Nunca devolve produto fora do catálogo e nunca indica remédio para sintoma.
 */
export function useBuscaTolerante({ textos, consulta, totalExato, usarIA = true }: Entrada): BuscaTolerante {
  const vocab = useMemo(() => (textos && textos.length > 0 ? criarVocabulario(textos) : null), [textos]);
  const texto = consulta.trim();

  const local = useMemo(() => {
    if (!vocab || totalExato > 0 || texto.length < 3) return null;
    return analisarConsulta(vocab, texto);
  }, [vocab, texto, totalExato]);

  const sintomaLocal = local?.sintoma === true;
  const corrigidaLocal = useMemo(() => {
    if (!vocab || !local || local.sintoma || !local.corrigida) return null;
    return contarCasos(vocab, local.corrigida) > 0 ? local.corrigida : null;
  }, [vocab, local]);

  const sugestaoLocal = useMemo(() => {
    if (!vocab || !local || local.sintoma || corrigidaLocal || !local.sugerida) return null;
    return contarCasos(vocab, local.sugerida) > 0 ? local.sugerida : null;
  }, [vocab, local, corrigidaLocal]);

  const candidatos = useMemo(() => {
    if (!vocab || !local || local.sintoma || corrigidaLocal || sugestaoLocal) return [];
    return candidatosValidos(candidatosParaIA(vocab, local.desconhecidas).join(","));
  }, [vocab, local, corrigidaLocal, sugestaoLocal]);

  const textoIA = consultaValida(texto);
  // Sem nenhuma palavra parecida no catálogo, o pedido pode ser por TIPO de produto ("shampoo pra caspa"): o servidor traduz com o Gemini.
  const intencao = usarIA && !!vocab && !!local && !local.sintoma && !corrigidaLocal && !sugestaoLocal && candidatos.length === 0 && textoIA.length >= 5;
  const chaveIA = usarIA && textoIA && candidatos.length > 0 ? `${textoIA}|${candidatos.join(",")}` : intencao ? `i|${textoIA}` : "";
  const [ia, setIa] = useState<{ chave: string; resposta: RespostaBuscaIA } | null>(null);

  useEffect(() => {
    if (!chaveIA) return;
    const controle = new AbortController();
    const guardada = lerCache(chaveIA);
    const timer = window.setTimeout(
      async () => {
        if (guardada) {
          setIa({ chave: chaveIA, resposta: guardada });
          return;
        }
        let esgotou = false;
        const limite = window.setTimeout(() => {
          esgotou = true;
          controle.abort();
        }, ESPERA_IA_MS);
        try {
          const resposta = await fetch(intencao ? `/api/busca-ia?q=${encodeURIComponent(textoIA)}&modo=intencao` : `/api/busca-ia?q=${encodeURIComponent(textoIA)}&c=${encodeURIComponent(candidatos.join(","))}`, { signal: controle.signal, headers: { accept: "application/json" } });
          const corpo: unknown = resposta.ok ? await resposta.json() : null;
          // Confere de novo no navegador: só vale palavra que estava na lista de candidatos.
          // Na busca por intenção o servidor já conferiu a lista; aqui o catálogo confere de novo em termosIAUteis.
          const termosIntencao = corpo && Array.isArray((corpo as { termos?: unknown }).termos) ? ((corpo as { termos: unknown[] }).termos.filter((t) => typeof t === "string") as string[]) : [];
          const limpa = corpo ? limparRespostaIA(corpo, intencao ? termosIntencao : candidatos) : null;
          if (limpa) {
            // Só guarda no navegador o que a IA (ou o cache dela) de fato respondeu; vazio por limite ou tempo não vale guardar.
            if (["ia", "cache"].includes(resposta.headers.get("x-busca-ia") ?? "")) guardarCache(chaveIA, limpa);
            setIa({ chave: chaveIA, resposta: limpa });
          } else {
            setIa({ chave: chaveIA, resposta: { termos: [], sintoma: false } });
          }
        } catch {
          // Sem rede ou tempo esgotado: segue sem IA. Se foi cancelado por uma nova digitação, não grava nada.
          if (esgotou || !controle.signal.aborted) setIa({ chave: chaveIA, resposta: { termos: [], sintoma: false } });
        } finally {
          window.clearTimeout(limite);
        }
      },
      guardada ? 0 : PAUSA_DIGITACAO_MS,
    );
    return () => {
      window.clearTimeout(timer);
      controle.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `candidatos` e `textoIA` já estão dentro de `chaveIA`
  }, [chaveIA]);

  const respostaIA = ia && ia.chave === chaveIA ? ia.resposta : null;
  const uteis = useMemo(() => (vocab && respostaIA && !respostaIA.sintoma ? termosIAUteis(vocab, respostaIA.termos) : []), [vocab, respostaIA]);

  if (sintomaLocal || respostaIA?.sintoma) return { tipo: "sintoma", procurando: false };
  if (corrigidaLocal) return { tipo: "corrigida", rotulo: corrigidaLocal, consultas: [corrigidaLocal], procurando: false };
  if (sugestaoLocal) return { tipo: "sugestao", sugestao: sugestaoLocal, procurando: false };
  if (uteis.length > 0) return { tipo: "corrigida", rotulo: uteis.join(", "), consultas: uteis, procurando: false };
  return { tipo: "nenhum", procurando: chaveIA !== "" && respostaIA === null };
}
