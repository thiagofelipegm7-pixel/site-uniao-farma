/**
 * Gemini (Google) como cérebro opcional das funções de IA do site.
 * A chave vem de um segredo do Worker (GEMINI_API_KEY) e nunca aparece no código, no navegador nem em resposta.
 * Sem a chave, o site continua usando a IA da Cloudflare, como antes.
 * Este arquivo não depende do Worker, para poder ser testado.
 */
export const MODELO_GEMINI_TEXTO = "gemini-2.5-flash-lite";
export const MODELO_GEMINI_VISAO = "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type PedidoGemini = {
  modelo: string;
  chave: string;
  sistema?: string;
  texto: string;
  imagem?: { tipo: string; base64: string };
  maxTokens: number;
  ms: number;
  esquema?: Record<string, unknown>;
  /** Pesquisa na web pelo Google (Search grounding). Nesse modo a resposta é texto livre (o Gemini não combina busca com JSON). */
  pesquisar?: boolean;
};

/** Modelo escolhido pelo dono (segredo GEMINI_MODELO) só vale se tiver cara de nome de modelo; senão usa o padrão. */
export function modeloEscolhido(configurado: string | undefined, padrao: string): string {
  const m = (configurado ?? "").trim();
  return /^gemini-[a-z0-9.\-]{2,40}$/.test(m) ? m : padrao;
}

/**
 * `simples` = pedido mínimo (sem esquema, sem filtros de segurança, sem controle de raciocínio): usado se o Google recusar o completo com 400.
 * O controle de raciocínio (thinkingBudget) só existe nos modelos 2.5; mandá-lo a outro modelo dá "invalid argument".
 */
export function montarCorpoGemini(p: Pick<PedidoGemini, "sistema" | "texto" | "imagem" | "maxTokens" | "esquema" | "pesquisar"> & { modelo?: string; simples?: boolean }): Record<string, unknown> {
  const partes: Record<string, unknown>[] = [{ text: p.texto }];
  if (p.imagem) partes.push({ inlineData: { mimeType: p.imagem.tipo, data: p.imagem.base64 } });
  const simples = p.simples === true;
  return {
    ...(p.sistema ? { systemInstruction: { parts: [{ text: p.sistema }] } } : {}),
    contents: [{ role: "user", parts: partes }],
    ...(p.pesquisar ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: {
      temperature: 0,
      maxOutputTokens: p.maxTokens,
      ...(p.pesquisar ? {} : { responseMimeType: "application/json" }),
      ...(p.esquema && !simples && !p.pesquisar ? { responseSchema: p.esquema } : {}),
      ...(!simples && p.modelo && /gemini-2\.5/.test(p.modelo) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
    // Receita pode citar remédio forte; o filtro padrão não deve cortar a transcrição.
    ...(simples ? {} : { safetySettings: ["HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT"].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })) }),
  };
}

/** Texto da resposta do Gemini, ou null se veio bloqueada, vazia ou fora do formato. */
export function textoDaRespostaGemini(corpo: unknown): string | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = (corpo as { candidates?: { finishReason?: string; content?: { parts?: { text?: unknown }[] } }[] }).candidates?.[0];
  if (!c || (c.finishReason && c.finishReason !== "STOP")) return null;
  const t = c.content?.parts?.map((x) => (typeof x.text === "string" ? x.text : "")).join("") ?? "";
  return t.trim() ? t : null;
}

/** Converte o esquema "json_schema" usado na Cloudflare para o formato do Gemini (OpenAPI simplificado). */
export function esquemaParaGemini(esquema: unknown): Record<string, unknown> | undefined {
  const s = (esquema as { json_schema?: { schema?: unknown } } | null)?.json_schema?.schema;
  if (!s || typeof s !== "object") return undefined;
  const limpar = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(limpar);
    if (!n || typeof n !== "object") return n;
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) {
      if (k === "additionalProperties") continue;
      o[k] = k === "type" && typeof v === "string" ? v.toUpperCase() : limpar(v);
    }
    return o;
  };
  return limpar(s) as Record<string, unknown>;
}

export type ResultadoGemini = { ok: true; response: string; fontes: string[] } | { ok: false; motivo: string };

/** Sites que o Gemini consultou na pesquisa (só o endereço do site, para a equipe conferir). */
export function fontesDaRespostaGemini(corpo: unknown): string[] {
  const c = (corpo as { candidates?: { groundingMetadata?: { groundingChunks?: { web?: { title?: unknown } }[] } }[] } | null)?.candidates?.[0];
  const nomes = (c?.groundingMetadata?.groundingChunks ?? []).map((x) => (typeof x.web?.title === "string" ? x.web.title.trim() : "")).filter((t) => /^[\w.-]+\.[a-z]{2,}$/i.test(t));
  return [...new Set(nomes)].slice(0, 5);
}

/** Nome "-latest" que o Google mantém apontando para um modelo vivo, usado se o modelo fixo for aposentado (404). */
export function modeloDeReserva(modelo: string): string | null {
  if (modelo.endsWith("-latest")) return null;
  return /flash-lite/.test(modelo) ? "gemini-flash-lite-latest" : /flash/.test(modelo) ? "gemini-flash-latest" : null;
}

/**
 * Chama o Gemini com tempo limite e diz o motivo quando falha (código HTTP e mensagem curta do Google, nunca a chave).
 * Se o Google recusar o pedido (400), repete em versão mínima; se o modelo não existir mais (404), tenta o nome "-latest" uma vez.
 */
export async function chamarGeminiComMotivo(p: PedidoGemini, buscar: typeof fetch = fetch): Promise<ResultadoGemini> {
  if (!p.chave) return { ok: false, motivo: "sem_chave" };
  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), p.ms);
  try {
    let modelo = p.modelo;
    let simples = false;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const r = await buscar(`${BASE}/${encodeURIComponent(modelo)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": p.chave },
        body: JSON.stringify(montarCorpoGemini({ ...p, modelo, simples })),
        signal: controle.signal,
      });
      if (r.status === 400 && !simples) {
        simples = true;
        continue;
      }
      if (r.status === 404 && modelo === p.modelo) {
        const outro = modeloDeReserva(modelo);
        if (outro) {
          modelo = outro;
          continue;
        }
      }
      if (!r.ok) {
        let msg = "";
        try {
          msg = String(((await r.json()) as { error?: { message?: string } })?.error?.message ?? "").replace(/\s+/g, " ").slice(0, 160);
        } catch {
          // sem corpo legível
        }
        return { ok: false, motivo: `http_${r.status}${msg ? `: ${msg}` : ""}` };
      }
      const corpo = await r.json();
      const texto = textoDaRespostaGemini(corpo);
      return texto ? { ok: true, response: texto, fontes: fontesDaRespostaGemini(corpo) } : { ok: false, motivo: "resposta_vazia_ou_bloqueada" };
    }
    return { ok: false, motivo: "sem_modelo" };
  } catch (e) {
    return { ok: false, motivo: (e as { name?: string })?.name === "AbortError" ? "tempo" : "rede" };
  } finally {
    clearTimeout(temporizador);
  }
}

/** Versão simples: devolve `{ response: texto }` (mesmo formato da IA da Cloudflare) ou null em qualquer problema. */
export async function chamarGemini(p: PedidoGemini, buscar: typeof fetch = fetch): Promise<{ response: string } | null> {
  const r = await chamarGeminiComMotivo(p, buscar);
  return r.ok ? { response: r.response } : null;
}
