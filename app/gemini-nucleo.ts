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
};

/** Modelo escolhido pelo dono (segredo GEMINI_MODELO) só vale se tiver cara de nome de modelo; senão usa o padrão. */
export function modeloEscolhido(configurado: string | undefined, padrao: string): string {
  const m = (configurado ?? "").trim();
  return /^gemini-[a-z0-9.\-]{2,40}$/.test(m) ? m : padrao;
}

export function montarCorpoGemini(p: Pick<PedidoGemini, "sistema" | "texto" | "imagem" | "maxTokens" | "esquema">): Record<string, unknown> {
  const partes: Record<string, unknown>[] = [{ text: p.texto }];
  if (p.imagem) partes.push({ inlineData: { mimeType: p.imagem.tipo, data: p.imagem.base64 } });
  return {
    ...(p.sistema ? { systemInstruction: { parts: [{ text: p.sistema }] } } : {}),
    contents: [{ role: "user", parts: partes }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: p.maxTokens,
      responseMimeType: "application/json",
      ...(p.esquema ? { responseSchema: p.esquema } : {}),
      thinkingConfig: { thinkingBudget: 0 },
    },
    // Receita pode citar remédio forte; o filtro padrão não deve cortar a transcrição.
    safetySettings: ["HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT"].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
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

/**
 * Chama o Gemini com tempo limite. Devolve `{ response: texto }` (mesmo formato que a IA da Cloudflare, para o resto do código não mudar)
 * ou null em qualquer problema. A chave vai no cabeçalho, nunca na URL, e nenhum erro devolve o corpo da resposta.
 */
export async function chamarGemini(p: PedidoGemini, buscar: typeof fetch = fetch): Promise<{ response: string } | null> {
  if (!p.chave) return null;
  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), p.ms);
  try {
    const r = await buscar(`${BASE}/${encodeURIComponent(p.modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": p.chave },
      body: JSON.stringify(montarCorpoGemini(p)),
      signal: controle.signal,
    });
    if (!r.ok) return null;
    const texto = textoDaRespostaGemini(await r.json());
    return texto ? { response: texto } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
