/**
 * Telemetria de SEO para IA sem dados pessoais (S-28, S-29, S-30; R-11, X-4).
 * Separa bots de treinamento de bots de citação em tempo real e identifica visitas vindas de assistentes de IA.
 */

export type TipoBotIa = "treinamento" | "citacao";

const BOTS_CITACAO: ReadonlyArray<[string, RegExp]> = [
  ["ChatGPT-User", /ChatGPT-User/i],
  ["OAI-SearchBot", /OAI-SearchBot/i],
  ["Perplexity-User", /Perplexity-User/i],
  ["PerplexityBot", /PerplexityBot/i],
  ["Claude-User", /Claude-User/i],
  ["Claude-SearchBot", /Claude-SearchBot/i],
];

const BOTS_TREINAMENTO: ReadonlyArray<[string, RegExp]> = [
  ["GPTBot", /GPTBot/i],
  ["Google-Extended", /Google-Extended/i],
  ["ClaudeBot", /ClaudeBot/i],
  ["Applebot-Extended", /Applebot-Extended/i],
  ["CCBot", /CCBot/i],
  ["Bytespider", /Bytespider/i],
];

const DOMINIOS_REFERENCIA_IA: ReadonlyArray<[string, RegExp]> = [
  ["chatgpt", /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/i],
  ["perplexity", /(^|\.)perplexity\.ai$/i],
  ["gemini", /(^|\.)gemini\.google\.com$/i],
  ["copilot", /(^|\.)copilot\.microsoft\.com$/i],
  ["claude", /(^|\.)claude\.ai$/i],
  ["deepseek", /(^|\.)deepseek\.com$/i],
];

/** Classifica o User-Agent entre bot de citação (tempo real) e bot de treinamento (S-30). */
export function classificarBotIa(userAgent: string | null | undefined): { tipo: TipoBotIa; bot: string } | null {
  const ua = (userAgent || "").trim();
  if (!ua) return null;
  for (const [bot, re] of BOTS_CITACAO) {
    if (re.test(ua)) return { tipo: "citacao", bot };
  }
  for (const [bot, re] of BOTS_TREINAMENTO) {
    if (re.test(ua)) return { tipo: "treinamento", bot };
  }
  return null;
}

/** Identifica se o referenciador veio de um assistente de IA (S-28, S-29). */
export function origemReferenciaIa(referrer: string | null | undefined): string | null {
  const raw = (referrer || "").trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    for (const [nome, re] of DOMINIOS_REFERENCIA_IA) {
      if (re.test(host)) return nome;
    }
  } catch {
    return null;
  }
  return null;
}
