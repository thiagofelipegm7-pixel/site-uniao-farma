/**
 * Registro de erros de JavaScript no aparelho dos clientes (plano de finalização, item 6): saber de um bug antes de alguém reclamar.
 * Privacidade: nada de cookie, IP, nome, telefone, texto digitado ou endereço completo. Só a mensagem (limpa), o arquivo/linha, o caminho da
 * página sem parâmetros e a família do navegador. Módulo puro (sem Cloudflare), testável.
 */
export type ErroBruto = { msg?: unknown; arq?: unknown; lin?: unknown; pag?: unknown; ua?: unknown };
export type ErroLimpo = { msg: string; arq: string; lin: number; pag: string; aparelho: string; chave: string };

/** Mensagens que não são do site (extensões, rolagem do navegador, anúncios) e só fazem barulho. */
const RUIDO = /ResizeObserver loop|Script error|chrome-extension|moz-extension|safari-extension|webkit-masked-url|Non-Error promise rejection|Load failed$|Failed to fetch$|NetworkError|AbortError|cancelled|googletagmanager|google-analytics|fbevents|doubleclick/i;

function limparTexto(t: unknown, max: number): string {
  return String(t ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[número]")
    .replace(/[?#][^\s)"']*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Família do navegador e do sistema, sem versão fina que identifique o aparelho. */
export function aparelhoDoUA(ua: unknown): string {
  const t = String(ua ?? "");
  const so = /iPhone|iPad|iPod/.test(t) ? "iOS" : /Android/.test(t) ? "Android" : /Windows/.test(t) ? "Windows" : /Mac OS X/.test(t) ? "Mac" : /Linux/.test(t) ? "Linux" : "outro";
  const nav = /SamsungBrowser/.test(t) ? "Samsung Internet" : /(Edg|EdgA|EdgiOS)\//.test(t) ? "Edge" : /(OPR|Opera)\//.test(t) ? "Opera" : /(CriOS|Chrome)\//.test(t) ? "Chrome" : /(FxiOS|Firefox)\//.test(t) ? "Firefox" : /Safari\//.test(t) ? "Safari" : "outro";
  return `${nav} no ${so}`;
}

function caminho(url: unknown): string {
  try {
    return new URL(String(url ?? ""), "https://x.invalid").pathname.slice(0, 120) || "/";
  } catch {
    return "/";
  }
}

/** Dá uma assinatura curta ao erro (mesma mensagem + arquivo + linha = mesmo erro), para contar em vez de listar mil vezes. */
export function chaveDoErro(msg: string, arq: string, lin: number): string {
  let h = 5381;
  for (const c of `${msg}|${arq}|${lin}`) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

export function limparErro(b: ErroBruto): ErroLimpo | null {
  const msg = limparTexto(b.msg, 300);
  if (!msg || RUIDO.test(msg)) return null;
  const arqBruto = String(b.arq ?? "");
  // Só erro do próprio site: arquivo de outro endereço (extensão, anúncio) é ruído.
  if (/^[a-z-]+:\/\//i.test(arqBruto) && !/^https?:\/\/([^/]*\.)?(xn--uniofarmasabar-8gbu\.com\.br|workers\.dev|localhost)(:\d+)?\//i.test(arqBruto)) return null;
  const arq = caminho(arqBruto).replace(/^\/_next\/static\//, "").slice(0, 80);
  const lin = Number.isFinite(Number(b.lin)) ? Math.max(0, Math.min(1_000_000, Math.floor(Number(b.lin)))) : 0;
  return { msg, arq, lin, pag: caminho(b.pag), aparelho: aparelhoDoUA(b.ua), chave: chaveDoErro(msg, arq, lin) };
}

export type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> } };
};

export const LIMITE_POR_DIA = 3000;

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS erro_cliente (chave TEXT NOT NULL, dia TEXT NOT NULL, msg TEXT NOT NULL, arq TEXT NOT NULL, lin INTEGER NOT NULL, pag TEXT NOT NULL, aparelho TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 1, ultimo TEXT NOT NULL, PRIMARY KEY (chave, dia, aparelho))");
}

/** Conta o erro no dia. Passou do limite diário, descarta (um erro em loop não pode encher o banco). */
export async function registrarErro(db: Banco, e: ErroLimpo, dia: string, agora = new Date()): Promise<boolean> {
  await garantir(db);
  const total = await db.prepare("SELECT COALESCE(SUM(n), 0) AS t FROM erro_cliente WHERE dia = ?").bind(dia).first<{ t: number }>();
  if ((total?.t ?? 0) >= LIMITE_POR_DIA) return false;
  await db
    .prepare("INSERT INTO erro_cliente (chave, dia, msg, arq, lin, pag, aparelho, n, ultimo) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(chave, dia, aparelho) DO UPDATE SET n = n + 1, ultimo = excluded.ultimo")
    .bind(e.chave, dia, e.msg, e.arq, e.lin, e.pag, e.aparelho, agora.toISOString())
    .run();
  await db.prepare("DELETE FROM erro_cliente WHERE dia < ?").bind(new Date(Date.parse(`${dia}T12:00:00Z`) - 14 * 86_400_000).toISOString().slice(0, 10)).run();
  return true;
}

export type LinhaErro = { chave: string; dia: string; msg: string; arq: string; lin: number; pag: string; aparelho: string; n: number; ultimo: string };

export async function listarErros(db: Banco, desde: string): Promise<LinhaErro[]> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, dia, msg, arq, lin, pag, aparelho, n, ultimo FROM erro_cliente WHERE dia >= ? ORDER BY dia DESC, n DESC LIMIT 300").bind(desde).all<LinhaErro>();
  return results;
}
