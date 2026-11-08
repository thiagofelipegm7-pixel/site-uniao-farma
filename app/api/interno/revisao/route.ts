import { banco } from "../../../estoque-fonte";
import { historico, mapaDeAprovacoes, type ItemDaFila } from "../../../revisao";
import fila from "../../../nacoes-unidas/produtos/dados/revisao-pendente.json";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Fila de revisão (o que a sincronização segurou), aprovações já feitas e o histórico. Só equipe logada. */
export async function GET() {
  const db = banco();
  const base = fila as { geradoEm: string | null; itens: ItemDaFila[] };
  const aprovacoes = db ? await mapaDeAprovacoes(db).catch(() => ({})) : {};
  const log = db ? await historico(db).catch(() => []) : [];
  return Response.json({ ok: true, geradoEm: base.geradoEm, itens: base.itens, aprovacoes, historico: log }, { headers: SEM_CACHE });
}
