/**
 * Busca tolerante a erro de escrita, 100% local (sem rede): ignora acento, junta sons iguais do português
 * (ss/ç/s/z, ch/x, k/c/qu, ph/f, h mudo, rr, o/u e e/i no fim) e compara com as palavras que existem no catálogo.
 * Só devolve palavras do próprio catálogo, então nunca aparece produto que a loja não tem.
 */
import { casaTermo, normalizarBusca, termosDaConsulta, termosDeBusca, textoDeBusca } from "./busca";

export type PalavraVocab = { w: string; pk: string; f: number; /** Palavra sem o plural (mesma regra de `termosDeBusca`) e o som dela: quem digita costuma errar a palavra já no singular. */ rad: string; pkr: string };
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
  const t = consulta.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return SINTOMA.test(t);
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
  const palavras = [...freq].map(([w, f]) => {
    const rad = w.length > 5 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
    return { w, pk: chaveFonetica(w), f, rad, pkr: chaveFonetica(rad) };
  });
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
    if (p.w === token || p.rad === token || Math.abs(p.w.length - token.length) > lim + 2) continue;
    // A busca já tira o plural da palavra digitada ("revetidos" vira "revetido"): compara com a palavra do catálogo inteira e sem plural.
    const dp = Math.min(distancia(token, p.w, lim), p.rad !== p.w ? distancia(token, p.rad, lim) : lim + 1);
    const dk = Math.min(distancia(pk, p.pk, lim), p.pkr !== p.pk ? distancia(pk, p.pkr, lim) : lim + 1);
    // A primeira letra (ou o primeiro som) precisa bater: evita "amoxilina" virar "camomilina". Vogal por vogal vale ("iscova" → "escova").
    const inicioIgual = p.w[0] === token[0] || p.pk[0] === pk[0] || (VOGAL.test(p.w[0]) && VOGAL.test(token[0]));
    if (!inicioIgual && !folgado) continue;
    const nota = Math.min(dp, dk === 0 ? 0 : dk + 0.25) + (inicioIgual ? 0 : 0.5);
    if (nota <= lim) saida.push({ w: p.w, nota, f: p.f });
  }
  return saida.sort((x, y) => x.nota - y.nota || y.f - x.f || x.w.length - y.w.length);
}

/** Melhor palavra do catálogo para uma palavra que não existe nele, ou null (com `segura`: dá para trocar sem perguntar). */
export function melhorParecida(vocab: Vocabulario, token: string): { w: string; segura: boolean } | null {
  if (token.length < 4 || !/^[a-z]+$/.test(token)) return null;
  const melhor = pontuar(vocab, token, limiteDeEdicao)[0];
  // Só entra quando é quase certa: 1 letra de diferença (ou palavra longa). Dúvida maior fica para a IA escolher entre candidatos.
  if (!melhor || (melhor.nota > 1.25 && !(melhor.nota <= 2 && token.length >= 10))) return null;
  return { w: melhor.w, segura: ehErroDeDigitacao(token, melhor.w) };
}

/**
 * Erro de digitação claro: mesmo som, duas letras trocadas de lugar, ou uma letra a mais/a menos em palavra de 7+ letras.
 * Qualquer outra diferença pode ser outro produto ("prednisolona" x "prednisona", "acido" x "amido"): o site pergunta antes.
 */
export function ehErroDeDigitacao(digitado: string, achado: string): boolean {
  const a = digitado.replace(/cs/g, "x");
  const b = achado.replace(/cs/g, "x");
  if (a === b || chaveFonetica(a) === chaveFonetica(b)) return true;
  if (a.length === b.length) {
    if ([...a].sort().join("") === [...b].sort().join("") && distancia(a, b, 1) === 1) return true; // duas letras trocadas de lugar
    // Uma letra no lugar de outra: erro de digitação só entre letras que se confundem (vogal por vogal, l/u no fim, m/n, x/s...).
    // Consoante comum por outra ("acido" x "amido", "verde" x "verme") costuma ser outro produto.
    if (distancia(a, b, 1) === 1) {
      const k = [...a].findIndex((c, n) => c !== b[n]);
      return PAR_CONFUNDIVEL.has(a[k] + b[k]) || (VOGAL.test(a[k]) && VOGAL.test(b[k]));
    }
    return false;
  }
  // Uma letra a mais ou a menos, em palavra de 7+ letras.
  return Math.abs(a.length - b.length) === 1 && Math.min(a.length, b.length) >= 7 && distancia(a, b, 1) === 1;
}

const PAR_CONFUNDIVEL = new Set(["lu", "ul", "mn", "nm", "xs", "sx", "xz", "zx", "xc", "cx", "sz", "zs", "sc", "cs", "kc", "ck", "bv", "vb", "gj", "jg", "tc", "ct"]);

/** Melhor palavra do catálogo para uma palavra que não existe nele, ou null. */
export function corrigirPalavra(vocab: Vocabulario, token: string): string | null {
  return melhorParecida(vocab, token)?.w ?? null;
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

/**
 * Jeitos de falar que a loja escreve de outro jeito no nome do produto (ex.: "fralda adulto" = "fralda geriátrica").
 * Cada grupo troca o trecho reconhecido por cada alternativa (as outras palavras da busca ficam). Só entra quando a busca exata não achou nada,
 * e só vale a alternativa que acha produto. Termos escolhidos olhando o catálogo da loja.
 */
const GRUPOS_SINONIMOS: readonly (readonly [RegExp, readonly string[]])[] = [
  [/\bfraldas? (de |para )?(adultos?|idosos?)\b/, ["fralda geriatrica", "fralda senior"]],
  [/\b(recem nascidos?|recem-nascidos?|rn)\b/, ["recem nascido", "rn", "newborn"]],
  [/\b(tintas?|tinturas?|coloracao|coloracoes)( (de|para|do) cabelos?)?\b/, ["tinta", "tintura", "coloracao", "tonalizante"]],
  [/\b(aparelhos?|laminas?) de barbear\b|\blaminas?\b/, ["barbear", "prestobarba", "aparelho de barbear"]],
  [/\bfitas? dental\b|\bfios? dentais?\b/, ["fio dental", "fita dental"]],
  [/\b(medidor|aparelho|monitor) de pressao( arterial)?\b|\btensiometro\b/, ["tensiometro", "pressao"]],
  [/\b(glicosimetro|medidor de glicose|aparelho de glicose|medidor de glicemia)\b/, ["glicos"]],
  [/\b(demaquilante|removedor de maquiagem|tira maquiagem)\b/, ["micelar", "demaquilante"]],
  [/\b(mercurocromo|merthiolate|merturo)\b/, ["iodo", "povidine", "mercurocromo"]],
  [/\bantitranspirantes?\b/, ["desodorante"]],
  [/\b(suplementos?|polivitaminicos?|multivitaminicos?)\b/, ["vitamina", "lavitan", "centrum"]],
  [/\bbicos? de (mamadeira|chupeta)\b/, ["bico", "chupeta", "mamadeira"]],
];

export function expandirSinonimos(consulta: string): string[] {
  const t = normalizarBusca(consulta);
  const saida: string[] = [];
  for (const [padrao, alternativas] of GRUPOS_SINONIMOS) {
    if (!padrao.test(t)) continue;
    for (const alt of alternativas) {
      const nova = t.replace(padrao, alt).replace(/\s+/g, " ").trim();
      if (nova !== t && !saida.includes(nova)) saida.push(nova);
    }
  }
  return saida;
}

/**
 * Busca parcial: quando nada casa com todas as palavras, mostra o que casa com o maior número delas (começando pelas primeiras,
 * que em português costumam ser o tipo do produto: "shampoo anticaspa" → "shampoo"). Devolve null se a busca já tem uma palavra só.
 */
export function buscaParcial(vocab: Vocabulario, consulta: string): { consulta: string; ignoradas: string[] } | null {
  const tokens = termosDeBusca(textoDeBusca(aplicarSinonimos(consulta).replace(/[-/]/g, " "))).filter((t) => !PALAVRAS_DE_LIGACAO.has(t));
  if (tokens.length < 2 || tokens.length > 5) return null;
  // Subconjuntos do maior para o menor; entre do mesmo tamanho, os que mantêm as primeiras palavras.
  const indices = tokens.map((_, i) => i);
  const subconjuntos: number[][] = [];
  for (let m = 1; m < 1 << tokens.length; m += 1) subconjuntos.push(indices.filter((i) => m & (1 << i)));
  // Quem mantém a primeira palavra (o tipo do produto) vem antes; depois os maiores.
  subconjuntos.sort((a, b) => Number(b.includes(0)) - Number(a.includes(0)) || b.length - a.length || a.reduce((x, y) => x + y, 0) - b.reduce((x, y) => x + y, 0));
  for (const sub of subconjuntos) {
    if (sub.length === tokens.length) continue;
    const texto = sub.map((i) => tokens[i]).join(" ");
    // Uma palavra sozinha só vale se não for genérica demais (casaria com a loja toda).
    const n = contarCasos(vocab, texto);
    if (n > 0 && (sub.length > 1 || n <= LIMITE_TERMO_IA * 3)) return { consulta: texto, ignoradas: indices.filter((i) => !sub.includes(i)).map((i) => tokens[i]) };
  }
  return null;
}

export type Analise = {
  /** Palavras da busca sem as de ligação. */
  tokens: string[];
  /** Palavras que não aparecem em nenhum produto. */
  desconhecidas: string[];
  /** Busca com as palavras erradas trocadas pelas do catálogo; null se nada foi trocado. */
  corrigida: string | null;
  /** Busca parecida que pode ser OUTRO produto: o site pergunta "Você quis dizer…?" em vez de trocar sozinho. */
  sugerida: string | null;
  sintoma: boolean;
  /** Jeitos de falar equivalentes que acham produto (ex.: "fralda adulto" → "fralda geriatrica"). */
  alternativas: string[];
  /** Mostra o que casa com parte das palavras (a palavra que sobrou sem produto fica de fora). */
  parcial: { consulta: string; ignoradas: string[] } | null;
};

function casa(vocab: Vocabulario, token: string): boolean {
  return vocab.corpus.includes(token);
}

/** "fraldinha" → "fralda", "sabonetinho" → "sabonete": diminutivo vira a palavra que o catálogo tem. */
export function semDiminutivo(vocab: Vocabulario, token: string): string | null {
  const m = /^(.{3,}?)(zinh[oa]s?|inh[oa]s?)$/.exec(token);
  if (!m) return null;
  for (const base of [m[1], `${m[1]}a`, `${m[1]}o`, `${m[1]}e`, `${m[1]}ao`]) {
    if (vocab.porPalavra.has(base)) return base;
  }
  return null;
}

/** Procura erro de escrita: troca cada palavra desconhecida pela mais parecida que existe no catálogo. */
export function analisarConsulta(vocab: Vocabulario, consulta: string): Analise {
  const trocada = aplicarSinonimos(consulta);
  const todos = termosDeBusca(textoDeBusca(trocada));
  const tokens = todos.filter((t) => !PALAVRAS_DE_LIGACAO.has(t));
  const sintoma = pareceSintoma(consulta);
  if (tokens.length === 0) return { tokens, desconhecidas: [], corrigida: null, sugerida: null, sintoma, alternativas: [], parcial: null };
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
  let duvida = false;
  const final = juntos.map((t) => {
    if (casa(vocab, t)) return t;
    const dim = semDiminutivo(vocab, t);
    if (dim) {
      mudou = true;
      return dim;
    }
    const achada = melhorParecida(vocab, t);
    if (!achada) return t;
    mudou = true;
    // Troca que não é erro de digitação claro vira pergunta ("Você quis dizer…?"): só com palavra de 5+ letras, senão a pergunta é ruído ("font" por "fone").
    if (!achada.segura) {
      if (achada.w.length < 5) return t;
      duvida = true;
    }
    return achada.w;
  });
  const texto = final.join(" ");
  const alternativas = expandirSinonimos(consulta).filter((c) => contarCasos(vocab, c) > 0);
  const resolvida = (mudou && contarCasos(vocab, texto) > 0) || alternativas.length > 0;
  return { tokens, desconhecidas, corrigida: mudou && !duvida ? texto : null, sugerida: mudou && duvida ? texto : null, sintoma, alternativas, parcial: resolvida ? null : buscaParcial(vocab, consulta) };
}

/** Produto casa com a busca se tiver todas as palavras (mesma regra da busca normal). */
export function casaConsulta(haystack: string, consulta: string): boolean {
  return termosDaConsulta(consulta).every((t) => casaTermo(haystack, t));
}

export function casaAlguma(haystack: string, consultas: readonly string[]): boolean {
  return consultas.some((c) => casaConsulta(haystack, c));
}

export function contarCasos(vocab: Vocabulario, consulta: string): number {
  const termos = termosDaConsulta(consulta);
  if (termos.length === 0) return 0;
  let n = 0;
  for (const t of vocab.textos) if (termos.every((x) => casaTermo(t, x))) n += 1;
  return n;
}

/** Termos da IA que servem: existem no catálogo e não casam com a loja inteira. */
export function termosIAUteis(vocab: Vocabulario, termos: readonly string[]): string[] {
  return termos.filter((termo) => {
    const n = contarCasos(vocab, termo);
    return n >= 1 && n <= LIMITE_TERMO_IA;
  });
}

export type InterpretacaoIA = { tipo: "corrigida"; consulta: string } | { tipo: "sugestao"; sugestao: string } | null;

/**
 * Decide o que fazer com as palavras que a IA escolheu para uma busca digitada errado.
 * - Cada palavra da IA precisa substituir uma palavra desconhecida parecida (distância curta); se não, a IA inventou e nada aparece.
 * - A busca nova mantém as outras palavras digitadas e precisa achar produto: "pílula do dia seguinte" não vira só "pilha".
 * - Só troca sozinho quando é erro de digitação claro; qualquer outra troca vira a pergunta "Você quis dizer…?".
 */
export function interpretarCorrecaoIA(vocab: Vocabulario, local: Pick<Analise, "tokens" | "desconhecidas">, termosIA: readonly string[]): InterpretacaoIA {
  const tokens = [...local.tokens];
  const livres = new Set(local.desconhecidas);
  const trocas: [string, string][] = [];
  for (const termo of termosIA) {
    let melhor: string | null = null;
    let menor = Infinity;
    for (const u of livres) {
      const lim = Math.max(2, Math.floor(u.length * 0.4));
      const d = Math.min(distancia(u, termo, lim), distancia(chaveFonetica(u), chaveFonetica(termo), lim));
      if (d <= lim && d < menor) {
        menor = d;
        melhor = u;
      }
    }
    if (melhor === null) return null;
    livres.delete(melhor);
    trocas.push([melhor, termo]);
  }
  if (trocas.length === 0) return null;
  const texto = tokens.map((t) => trocas.find(([u]) => u === t)?.[1] ?? t).join(" ");
  // Sobrou palavra que a loja não conhece: a busca nova não acharia nada.
  if (texto.split(" ").some((t) => !casa(vocab, t)) || contarCasos(vocab, texto) === 0) return null;
  return trocas.every(([u, t]) => ehErroDeDigitacao(u, t)) ? { tipo: "corrigida", consulta: texto } : { tipo: "sugestao", sugestao: texto };
}
