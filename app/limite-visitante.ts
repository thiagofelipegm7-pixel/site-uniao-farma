import { criarLimitador } from "./busca-ia-nucleo";

/** Teto que um cliente normal nunca alcança: uns 30 envios da cesta em 10 minutos. */
export const PRE_VENDA_MAX_POR_VISITANTE = 30;
export const PRE_VENDA_JANELA_MS = 10 * 60 * 1000;
/** Mesmo teto que a rota já aplicava no Content-Length; também vale o corpo lido, se o cabeçalho faltar. */
export const PRE_VENDA_TAMANHO_MAX = 16_000;
const RETRY_AFTER_SEGUNDOS = String(Math.ceil(PRE_VENDA_JANELA_MS / 1000));

export type BancoLimite = {
  prepare(sql: string): { bind(...valores: unknown[]): { first<T = unknown>(): Promise<T | null>; run(): Promise<unknown> } };
};

export function visitanteDaRequisicao(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function respostaLimitePreVenda(): Response {
  return Response.json(
    { ok: false, erro: "limite" },
    { status: 429, headers: { "cache-control": "no-store", "Retry-After": RETRY_AFTER_SEGUNDOS } },
  );
}

export function corpoPreVendaGrandeDemais(tamanho: number): boolean {
  return Number.isFinite(tamanho) && tamanho > PRE_VENDA_TAMANHO_MAX;
}

async function resumoDoVisitante(visitante: string): Promise<string> {
  const bytes = new TextEncoder().encode(`uf-pre-venda|${visitante}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Contador no banco, compartilhado entre instâncias do Worker. Guarda só um resumo irreversível do visitante e um número por janela, nunca o IP.
 * Se o banco falhar, deixa passar: o limite na memória da instância continua valendo.
 */
export async function dentroDoLimitePreVendaCompartilhado(
  db: BancoLimite | null,
  visitante: string,
  max: number = PRE_VENDA_MAX_POR_VISITANTE,
  janelaMs: number = PRE_VENDA_JANELA_MS,
  agora: () => number = Date.now,
): Promise<boolean> {
  if (!db) return true;
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS limite_pre_venda (chave TEXT NOT NULL, janela INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (chave, janela))").bind().run();
    const janela = Math.floor(agora() / janelaMs);
    const chave = await resumoDoVisitante(visitante);
    const linha = await db
      .prepare("INSERT INTO limite_pre_venda (chave, janela, n) VALUES (?, ?, 1) ON CONFLICT(chave, janela) DO UPDATE SET n = n + 1 RETURNING n")
      .bind(chave, janela)
      .first<{ n: number }>();
    if (Math.random() < 0.02) await db.prepare("DELETE FROM limite_pre_venda WHERE janela < ?").bind(janela - 1).run();
    return (linha?.n ?? 1) <= max;
  } catch {
    return true;
  }
}

/** Junta o limite local (rápido) com o do banco (vale para todas as instâncias). */
export function criarControlePreVenda(opcoes?: { max?: number; janelaMs?: number; agora?: () => number }) {
  const max = opcoes?.max ?? PRE_VENDA_MAX_POR_VISITANTE;
  const janelaMs = opcoes?.janelaMs ?? PRE_VENDA_JANELA_MS;
  const memoria = criarLimitador(max, janelaMs, opcoes?.agora);
  return async function permitir(request: Request, db: BancoLimite | null): Promise<boolean> {
    const visitante = visitanteDaRequisicao(request);
    if (!memoria(visitante)) return false;
    return dentroDoLimitePreVendaCompartilhado(db, visitante, max, janelaMs, opcoes?.agora);
  };
}

export const permitirPreVenda = criarControlePreVenda();
