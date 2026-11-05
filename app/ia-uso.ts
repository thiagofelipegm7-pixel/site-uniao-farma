import * as cloudflare from "cloudflare:workers";

/**
 * Contadores de uso da IA (busca e leitura de receita) para o painel /interno/catalogo.
 * Guarda só dia, tipo, resultado e quantidade: nada de texto digitado, foto, IP ou identificador.
 * Qualquer falha é ignorada: o contador nunca atrapalha a busca nem a leitura.
 */
type Banco = {
  prepare(consulta: string): { bind(...valores: unknown[]): { run(): Promise<unknown>; all<T = unknown>(): Promise<{ results?: T[] }> } };
};

let tabelaPronta = false;

function banco(): Banco | undefined {
  try {
    return (cloudflare.env as { DB?: Banco }).DB;
  } catch {
    return undefined;
  }
}

async function garantirTabela(db: Banco) {
  if (tabelaPronta) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS ia_uso (dia TEXT NOT NULL, tipo TEXT NOT NULL, resultado TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (dia, tipo, resultado))").bind().run();
  tabelaPronta = true;
}

function diaDeBrasilia(agora = Date.now()) {
  return new Date(agora - 3 * 3_600_000).toISOString().slice(0, 10);
}

async function gravar(tipo: "busca" | "receita", resultado: string) {
  try {
    const db = banco();
    if (!db) return;
    await garantirTabela(db);
    await db
      .prepare("INSERT INTO ia_uso (dia, tipo, resultado, n) VALUES (?, ?, ?, 1) ON CONFLICT(dia, tipo, resultado) DO UPDATE SET n = n + 1")
      .bind(diaDeBrasilia(), tipo, resultado.slice(0, 40))
      .run();
  } catch {
    // contador é opcional
  }
}

/** Conta um uso sem atrasar a resposta (waitUntil quando existir). */
export function registrarUsoIA(tipo: "busca" | "receita", resultado: string | undefined) {
  if (!resultado) return;
  const promessa = gravar(tipo, resultado);
  try {
    const wu = (cloudflare as unknown as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil;
    if (typeof wu === "function") wu(promessa);
  } catch {
    // sem waitUntil: a gravação segue em segundo plano
  }
}

export async function lerUsoIA(dias: number): Promise<{ dia: string; tipo: string; resultado: string; n: number }[] | null> {
  try {
    const db = banco();
    if (!db) return null;
    await garantirTabela(db);
    const desde = diaDeBrasilia(Date.now() - (dias - 1) * 86_400_000);
    const r = await db.prepare("SELECT dia, tipo, resultado, n FROM ia_uso WHERE dia >= ? ORDER BY dia DESC").bind(desde).all<{ dia: string; tipo: string; resultado: string; n: number }>();
    return r.results ?? [];
  } catch {
    return null;
  }
}
