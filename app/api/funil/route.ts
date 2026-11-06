import { banco } from "../../estoque-fonte";
import { etapaValida } from "../../funil";

export const dynamic = "force-dynamic";

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown> } };
};

const diaBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Conta uma etapa do funil da cesta no dia (sem dados pessoais). */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 512) return new Response(null, { status: 413 });
  const corpo = (await request.json().catch(() => ({}))) as { etapa?: unknown };
  if (!etapaValida(corpo.etapa)) return new Response(null, { status: 400 });
  const db = banco() as Banco | null;
  if (!db) return new Response(null, { status: 204 });
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS funil_dia (dia TEXT NOT NULL, etapa TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, etapa))");
    await db.prepare("INSERT INTO funil_dia (dia, etapa, n) VALUES (?, ?, 1) ON CONFLICT(dia, etapa) DO UPDATE SET n = n + 1").bind(diaBrasilia(), corpo.etapa).run();
  } catch {
    // o funil nunca pode derrubar o pedido
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
