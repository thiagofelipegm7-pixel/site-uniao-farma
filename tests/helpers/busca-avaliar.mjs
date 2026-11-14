// Avalia uma busca como o site faz, só com os arquivos do repositório (sem rede): busca exata, sintoma conhecido, jeito de falar equivalente,
// correção de digitação, pergunta "Você quis dizer", busca parcial. Usado pelo teste de regressão e pelo script scripts/busca-casos.mjs.
import { readFileSync } from "node:fs";
import { criarVocabulario, analisarConsulta, contarCasos } from "../../app/nacoes-unidas/produtos/busca-tolerante.ts";
import { termosDaConsulta } from "../../app/nacoes-unidas/produtos/busca.ts";
import { sintomaConhecido } from "../../app/nacoes-unidas/produtos/sintomas-otc.ts";

const lj = (a) => JSON.parse(readFileSync(new URL(`../../${a}`, import.meta.url), "utf8"));

export function carregarContexto() {
  const textos = [...lj("public/dados/nacoes/catalogo-busca.json").map((i) => i.busca), ...lj("public/dados/nacoes/restritos-busca.json").map((i) => i.busca)];
  return { textos, vocab: criarVocabulario(textos) };
}

/** st: ok (achou direto) | sintoma-lista | alternativa | corrigida | parcial | sugestao | sintoma | ZERO. n = quantos produtos aparecem. */
export function avaliarBusca(q, { textos, vocab }) {
  const t = termosDaConsulta(q);
  const exato = textos.filter((x) => t.every((w) => x.includes(w))).length;
  if (exato > 0) return { q, st: "ok", n: exato };
  if (sintomaConhecido(q)) return { q, st: "sintoma-lista", n: 1 };
  const a = analisarConsulta(vocab, q);
  if (a.sintoma) return { q, st: "sintoma", n: 0 };
  if (a.alternativas?.length) return { q, st: "alternativa", n: a.alternativas.reduce((x, c) => x + contarCasos(vocab, c), 0) };
  if (a.corrigida) {
    const n = contarCasos(vocab, a.corrigida);
    if (n > 0) return { q, st: "corrigida", n };
  }
  if (a.sugerida) {
    const n = contarCasos(vocab, a.sugerida);
    if (n > 0) return { q, st: "sugestao", n };
  }
  if (a.parcial) return { q, st: "parcial", n: contarCasos(vocab, a.parcial.consulta) };
  return { q, st: "ZERO", n: 0 };
}

/** Quanto mais acima, melhor a resposta da busca. Serve para dizer se uma busca piorou. */
export const NOTA = { ok: 5, "sintoma-lista": 5, alternativa: 4, corrigida: 4, sugestao: 3, sintoma: 3, parcial: 2, ZERO: 0 };
