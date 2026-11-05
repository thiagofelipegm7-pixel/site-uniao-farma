/**
 * Busca tolerante a erro de escrita, 100% local (sem rede): ignora acento, junta sons iguais do português
 * (ss/ç/s/z, ch/x, k/c/qu, ph/f, h mudo, rr, o/u e e/i no fim) e compara com as palavras que existem no catálogo.
 * Só devolve palavras do próprio catálogo, então nunca aparece produto que a loja não tem.
 */
import { normalizarBusca, termosDeBusca } from "./busca";

export type PalavraVocab = { w: string; pk: string; f: number };
export type Vocabulario = {
  /** Texto de busca de cada produto (já sem acento e em minúsculas). */
  textos: readonly string[];
  /** Todos os textos juntos, para saber rápido se uma palavra aparece em algum produto. */
  corpus: string;
  palavras: readonly PalavraVocab[];
  porPalavra: ReadonlyMap<string, PalavraVocab>;
};

/** Palavras de ligação que atrapalham a busca por texto livre ("remedio pra dor"). */
const PALAVRAS_DE_LIGACAO = new Set([
  "de", "do", "da", "dos", "das", "pra", "para", "pro", "um", "uma", "o", "a", "os", "as", "e", "com", "sem", "no", "na",
  "em", "quero", "preciso", "tem", "tenho", "comprar", "queria", "procuro", "remedio", "remedios", "medicamento", "medicamentos", "produto",
]);

/** Quantos produtos um termo sugerido pela IA pode casar. Acima disso é genérico demais (casaria com a loja toda). */
export const LIMITE_TERMO_IA = 150;

const SINTOMA = /\b(remedios?|medicamentos?)\s+(pra|para|de|do|da|contra|que|pro)\b|\bo que (tomar|tomo|posso tomar|usar)\b|\b(pra|para|contra)\s+(dor|febre|tosse|gripe|infeccao|alergia|enjoo|azia|diarreia|colica)\b|\b(dor|dores|febre|tosse|enjoo|azia|diarreia|colica|infeccao|gastrite|resfriado|coriza|enxaqueca|alergia)\s+(de|do|da|no|na|nas|nos|em|ao|forte|muita|muito)\b|\b(estou|to|tou|tenho|sinto|estar)\s+(com|sentindo|muito|passando)\b/;

/** Pedido de remédio para um problema de saúde: o site não indica produto, quem orienta é o farmacêutico. */
export function pareceSintoma(consulta: string): boolean {
  return SINTOMA.test(consulta.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
}

/** Junta sons iguais: duas grafias que soam parecido geram a mesma chave. */
export function chaveFonetica(palavra: string): string {
  let s = palavra;
  s = s.replace(/ph/g, "f").replace(/sch|sh|ch/g, "x");
  s = s.replace(/lh/g, "L").replace(/nh/g, "N");
  s = s.replace(/h/g, "");
  s = s.replace(/qu(?=[ei])/g, "k").replace(/gu(?=[ei])/g, "g");
  s = s.replace(/ck|q/g, "k");
  s = s.replace(/c(?=[ei])/g, "s").replace(/c/g, "k");
  s = s.replace(/g(?=[ei])/g, "j");
  s = s.replace(/z/g, "s").replace(/w/g, "v").replace(/y/g, "i");
  s = s.replace(/(.)\1+/g, "$1");
  s = s.replace(/m(?=[bp])/g, "n");
  s = s.replace(/e$/, "i").replace(/o$/, "u");
  return s;
}

/** Distância de edição (inserir, apagar, trocar e trocar duas letras vizinhas), com corte: acima de `max` devolve max + 1. */
export function distancia(a: string, b: string, max = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let anterior2: number[] = [];
  let anterior = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i += 1) {
    const atual = [i];
    let minimo = i;
    for (let j = 1; j <= m; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, anterior2[j - 2] + 1);
      atual[j] = v;
      if (v < minimo) minimo = v;
    }
    if (minimo > max) return max + 1;
    anterior2 = anterior;
    anterior = atual;
  }
  return anterior[m];
}

export function criarVocabulario(textos: readonly string[]): Vocabulario {
  const freq = new Map<string, number>();
  for (const texto of textos) {
    for (const w of texto.split(/[^a-z]+/)) {
      if (w.length >= 3) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  const palavras = [...freq].map(([w, f]) => ({ w, pk: chaveFonetica(w), f }));
  return { textos, corpus: textos.join("\n"), palavras, porPalavra: new Map(palavras.map((p) => [p.w, p])) };
}

const VOGAL = /[aeiou]/;

function limiteDeEdicao(tamanho: number): number {
  if (tamanho <= 3) return 0;
  if (tamanho <= 6) return 1;
  if (tamanho <= 9) return 2;
  return 3;
}

type Candidato = { w: string; nota: number; f: number };

function pontuar(vocab: Vocabulario, token: string, limite: (tamanho: number) => number, folgado = false): Candidato[] {
  const pk = chaveFonetica(token);
  const lim = limite(token.length);
  const saida: Candidato[] = [];
  for (const p of vocab.palavras) {
    if (p.w === token || Math.abs(p.w.length - token.length) > lim + 1) continue;
    const dp = distancia(token, p.w, lim);
    const dk = distancia(pk, p.pk, lim);
    // A primeira letra (ou o primeiro som) precisa bater: evita "amoxilina" virar "camomilina". Vogal por vogal vale ("iscova" → "escova").
    const inicioIgual = p.w[0] === token[0] || p.pk[0] === pk[0] || (VOGAL.test(p.w[0]) && VOGAL.test(token[0]));
    if (!inicioIgual && !folgado) continue;
    const nota = Math.min(dp, dk === 0 ? 0 : dk + 0.25) + (inicioIgual ? 0 : 0.5);
    if (nota <= lim) saida.push({ w: p.w, nota, f: p.f });
  }
  return saida.sort((x, y) => x.nota - y.nota || y.f - x.f || x.w.length - y.w.length);
}

/** Melhor palavra do catálogo para uma palavra que não existe nele, ou null. */
export function corrigirPalavra(vocab: Vocabulario, token: string): string | null {
  if (token.length < 4 || !/^[a-z]+$/.test(token)) return null;
  const melhor = pontuar(vocab, token, limiteDeEdicao)[0];
  // Correção automática só quando é quase certa: 1 letra de diferença (ou palavra longa). Dúvida maior fica para a IA escolher entre candidatos.
  if (!melhor || (melhor.nota > 1.25 && !(melhor.nota <= 2 && token.length >= 10))) return null;
  return melhor.w;
}

/** Palavras do catálogo que se parecem com o texto (régua mais folgada), para a IA escolher entre elas. */
export function candidatosParaIA(vocab: Vocabulario, tokens: readonly string[], porPalavra = 8): string[] {
  const saida: string[] = [];
  for (const token of tokens) {
    if (token.length < 4 || !/^[a-z]+$/.test(token)) continue;
    for (const c of pontuar(vocab, token, (n) => Math.max(2, Math.floor(n * 0.4)), true).slice(0, porPalavra)) {
      if (!saida.includes(c.w)) saida.push(c.w);
    }
  }
  return saida.slice(0, 16);
}

/** Jeitos populares de falar produtos que não são remédio. Troca fixa, sem IA. */
const SINONIMOS: readonly (readonly [RegExp, string])[] = [
  [/\bpastas? (de )?dent(e|es|al)\b/g, "creme dental"],
  [/\bcamisinhas?\b|\bcamizinhas?\b|\bcamisas? de venus\b/g, "preservativo"],
  [/\bband ?-?aids?\b/g, "curativo"],
  [/\b(xampus?|champus?|xanpus?)\b/g, "shampoo"],
];

export function aplicarSinonimos(consulta: string): string {
  return SINONIMOS.reduce((texto, [regra, troca]) => texto.replace(regra, troca), normalizarBusca(consulta));
}

export type Analise = {
  /** Palavras da busca sem as de ligação. */
  tokens: string[];
  /** Palavras que não aparecem em nenhum produto. */
  desconhecidas: string[];
  /** Busca com as palavras erradas trocadas pelas do catálogo; null se nada foi trocado. */
  corrigida: string | null;
  sintoma: boolean;
};

function casa(vocab: Vocabulario, token: string): boolean {
  return vocab.corpus.includes(token);
}

/** Procura erro de escrita: troca cada palavra desconhecida pela mais parecida que existe no catálogo. */
export function analisarConsulta(vocab: Vocabulario, consulta: string): Analise {
  const trocada = aplicarSinonimos(consulta);
  const todos = termosDeBusca(trocada);
  const tokens = todos.filter((t) => !PALAVRAS_DE_LIGACAO.has(t));
  const sintoma = pareceSintoma(consulta);
  if (tokens.length === 0) return { tokens, desconhecidas: [], corrigida: null, sintoma };
  // "dor flex" → "dorflex": duas palavras vizinhas que, coladas, existem no catálogo.
  const juntos: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const colado = i + 1 < tokens.length ? tokens[i] + tokens[i + 1] : "";
    if (colado && vocab.porPalavra.has(colado)) {
      juntos.push(colado);
      i += 1;
    } else {
      juntos.push(tokens[i]);
    }
  }
  const desconhecidas = juntos.filter((t) => !casa(vocab, t));
  let mudou = juntos.length !== tokens.length || trocada !== normalizarBusca(consulta);
  const final = juntos.map((t) => {
    if (casa(vocab, t)) return t;
    const certa = corrigirPalavra(vocab, t);
    if (certa) mudou = true;
    return certa ?? t;
  });
  return { tokens, desconhecidas, corrigida: mudou ? final.join(" ") : null, sintoma };
}

/** Produto casa com a busca se tiver todas as palavras (mesma regra da busca normal). */
export function casaConsulta(haystack: string, consulta: string): boolean {
  return termosDeBusca(consulta).every((t) => haystack.includes(t));
}

export function casaAlguma(haystack: string, consultas: readonly string[]): boolean {
  return consultas.some((c) => casaConsulta(haystack, c));
}

export function contarCasos(vocab: Vocabulario, consulta: string): number {
  const termos = termosDeBusca(consulta);
  if (termos.length === 0) return 0;
  let n = 0;
  for (const t of vocab.textos) if (termos.every((x) => t.includes(x))) n += 1;
  return n;
}

/** Termos da IA que servem: existem no catálogo e não casam com a loja inteira. */
export function termosIAUteis(vocab: Vocabulario, termos: readonly string[]): string[] {
  return termos.filter((termo) => {
    const n = contarCasos(vocab, termo);
    return n >= 1 && n <= LIMITE_TERMO_IA;
  });
}
