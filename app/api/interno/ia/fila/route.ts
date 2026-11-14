import { banco } from "../../../../estoque-fonte";
import { decidir, pendentes } from "../../../../ia-fila";
import { nomeDeExibicao } from "../../../../nome-exibicao";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Sugestões da IA esperando revisão da equipe (só equipe logada). */
export async function GET() {
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const lista = await pendentes(db);
  return Response.json({ ok: true, itens: lista.map((i) => ({ original: i.original, exibicao: nomeDeExibicao(i.original), descricao: i.descricao, marca: i.marca })) }, { headers: SEM_CACHE });
}

/** Tira da fila: aprovada (o painel já salvou o texto pelo fluxo normal) ou descartada. */
export async function POST(request: Request) {
  let c: { original?: unknown; estado?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  if (!original || original.length > 200 || (c.estado !== "aprovada" && c.estado !== "descartada")) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  await decidir(db, original, c.estado);
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
