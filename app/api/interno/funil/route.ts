import { banco } from "../../../estoque-fonte";
import { ETAPAS_FUNIL, etapaValida, montarFunil, type EtapaFunil } from "../../../funil";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { all<T>(): Promise<{ results: T[] }> } };
};

/** Funil dos últimos 7 e 30 dias (painel interno; a senha é pedida pelo middleware). */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  await db.exec("CREATE TABLE IF NOT EXISTS funil_dia (dia TEXT NOT NULL, etapa TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (dia, etapa))");
  const hoje = Date.now() - 3 * 3_600_000;
  const desde = (dias: number) => new Date(hoje - dias * 86_400_000).toISOString().slice(0, 10);
  const somar = async (dias: number) => {
    const { results } = await db.prepare("SELECT etapa, SUM(n) AS total FROM funil_dia WHERE dia >= ? GROUP BY etapa").bind(desde(dias - 1)).all<{ etapa: string; total: number }>();
    const totais: Partial<Record<EtapaFunil, number>> = {};
    for (const r of results) if (etapaValida(r.etapa)) totais[r.etapa] = Number(r.total) || 0;
    return montarFunil(totais);
  };
  return Response.json({ ok: true, etapas: ETAPAS_FUNIL, sete: await somar(7), trinta: await somar(30) }, { headers: SEM_CACHE });
}
