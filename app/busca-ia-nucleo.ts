/**
 * Núcleo da busca com IA (sem rede, sem Cloudflare): prompt, limpeza da resposta e limite de uso.
 * A IA só reescreve o texto digitado em termos de busca. Quem decide o que aparece na tela é o catálogo da loja:
 * o navegador só mostra produtos que já existem na lista e que combinam com esses termos.
 */

export const MODELO_IA = "@cf/meta/llama-3.2-3b-instruct";
export const MAX_TERMOS = 4;
export const TAMANHO_MIN = 3;
export const TAMANHO_MAX = 60;

export const PROMPT_SISTEMA = `Você corrige erros de digitação na busca de uma farmácia brasileira. Você NÃO é farmacêutico.
Entrada (JSON): {"texto":"o que a pessoa digitou","candidatos":["palavras que existem no catálogo e se parecem com o texto"]}
Saída: SOMENTE um JSON {"termos":[...],"sintoma":false}.

Regras:
- Só devolva em "termos" palavras que estejam na lista "candidatos", escritas exatamente como estão lá, e só quando o texto for claramente uma digitação errada daquela palavra.
- Se nenhum candidato for claramente a palavra certa, devolva "termos":[]. Nunca invente nome de remédio, marca ou produto.
- Até 4 termos. Sem frases, sem explicação.
- NÃO recomende remédio, NÃO indique tratamento e NÃO dê conselho de saúde.
- Se o texto descrever sintoma, doença ou pedir remédio para algo (ex.: "remedio pra dor", "o que tomar para febre"), devolva {"termos":[],"sintoma":true}.

Exemplos:
{"texto":"diprona","candidatos":["dipirona","diprospan"]} -> {"termos":["dipirona"],"sintoma":false}
{"texto":"zorflex","candidatos":["dorflex","florex"]} -> {"termos":["dorflex"],"sintoma":false}
{"texto":"hipoglos","candidatos":["hipopo"]} -> {"termos":[],"sintoma":false}
{"texto":"remedio pra dor de cabessa","candidatos":["cabeca"]} -> {"termos":[],"sintoma":true}
{"texto":"asdfgh","candidatos":[]} -> {"termos":[],"sintoma":false}`;

export function montarEntrada(texto: string, candidatos: readonly string[]): string {
  return JSON.stringify({ texto, candidatos });
}

export const ESQUEMA_RESPOSTA = {
  type: "json_schema",
  json_schema: {
    name: "termos_busca",
    schema: {
      type: "object",
      properties: {
        termos: { type: "array", items: { type: "string" }, maxItems: MAX_TERMOS },
        sintoma: { type: "boolean" },
      },
      required: ["termos", "sintoma"],
      additionalProperties: false,
    },
  },
} as const;

export type RespostaBuscaIA = { termos: string[]; sintoma: boolean };

/** Palavras amplas demais: casariam com a loja inteira, ou são conselho e não nome de produto. */
const TERMOS_PROIBIDOS = new Set([
  "remedio", "remedios", "medicamento", "medicamentos", "produto", "produtos", "farmacia", "drogaria", "tratamento",
  "dose", "dosagem", "receita", "tomar", "usar", "cura", "curar", "antibiotico", "controlado", "controlados",
]);

function semAcento(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Texto digitado pronto para consulta e chave de cache: sem acento, só letras, números e espaço. Vazio se não servir. */
export function consultaValida(bruto: unknown): string {
  if (typeof bruto !== "string") return "";
  const limpo = semAcento(bruto).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (limpo.length < TAMANHO_MIN || limpo.length > TAMANHO_MAX) return "";
  if (!/[a-z]{2}/.test(limpo)) return "";
  return limpo;
}

/** Candidatos vindos da URL ("dipirona,diprospan"): só palavras de letras, até 16. */
export function candidatosValidos(bruto: unknown): string[] {
  if (typeof bruto !== "string") return [];
  const saida: string[] = [];
  for (const parte of bruto.split(",")) {
    const w = semAcento(parte).trim();
    if (/^[a-z]{3,24}$/.test(w) && !saida.includes(w)) saida.push(w);
    if (saida.length >= 16) break;
  }
  return saida;
}

/**
 * Aceita o que o modelo devolveu em qualquer formato (objeto, texto JSON ou texto com JSON no meio).
 * Se o modelo marcar sintoma, nenhum termo passa: a IA nunca indica produto para problema de saúde.
 */
export function limparRespostaIA(bruto: unknown, candidatos: readonly string[] = []): RespostaBuscaIA | null {
  let dado: unknown = bruto;
  if (typeof dado === "string") {
    const inicio = dado.indexOf("{");
    const fim = dado.lastIndexOf("}");
    if (inicio < 0 || fim <= inicio) return null;
    try {
      dado = JSON.parse(dado.slice(inicio, fim + 1));
    } catch {
      return null;
    }
  }
  if (!dado || typeof dado !== "object") return null;
  const { termos, sintoma } = dado as { termos?: unknown; sintoma?: unknown };
  if (sintoma === true) return { termos: [], sintoma: true };
  if (!Array.isArray(termos)) return null;
  // Só passa o que veio da lista de candidatos (palavras que existem no catálogo).
  const permitidos = new Set<string>(candidatos);
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const item of termos) {
    if (typeof item !== "string") continue;
    const termo = semAcento(item).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    if (termo.length < 3 || termo.length > 30 || vistos.has(termo) || TERMOS_PROIBIDOS.has(termo) || !permitidos.has(termo)) continue;
    vistos.add(termo);
    saida.push(termo);
    if (saida.length >= MAX_TERMOS) break;
  }
  return { termos: saida, sintoma: false };
}

/** Extrai o texto/objeto útil da resposta do Workers AI (formato antigo `response` ou formato chat.completion). */
export function conteudoDaRespostaIA(resultado: unknown): unknown {
  if (!resultado || typeof resultado !== "object") return resultado;
  const r = resultado as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
  if (r.response !== undefined && r.response !== null && r.response !== "") return r.response;
  return r.choices?.[0]?.message?.content ?? null;
}

/** Limite por janela de tempo, na memória do servidor. Barato e aproximado (cada instância tem o seu contador). */
export function criarLimitador(max: number, janelaMs: number, agora: () => number = Date.now) {
  const marcas = new Map<string, number[]>();
  return function permitir(chave: string): boolean {
    const t = agora();
    const recentes = (marcas.get(chave) ?? []).filter((m) => t - m < janelaMs);
    if (recentes.length >= max) {
      marcas.set(chave, recentes);
      return false;
    }
    recentes.push(t);
    marcas.set(chave, recentes);
    if (marcas.size > 2000) {
      for (const [k, v] of marcas) if (v.every((m) => t - m >= janelaMs)) marcas.delete(k);
    }
    return true;
  };
}
