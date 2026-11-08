import { banco } from "../../../estoque-fonte";
import { listarErros } from "../../../erros";

export const dynamic = "force-dynamic";

/** Erros dos últimos 7 dias, do mais frequente para o menos. Só equipe logada. */
export async function GET() {
  const db = banco();
  const desde = new Date(Date.now() - 3 * 3_600_000 - 7 * 86_400_000).toISOString().slice(0, 10);
  const erros = db ? await listarErros(db, desde).catch(() => []) : [];
  return Response.json({ ok: true, desde, erros }, { headers: { "cache-control": "no-store" } });
}
