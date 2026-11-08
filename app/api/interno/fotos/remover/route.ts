import { banco } from "../../../../estoque-fonte";
import { dispararSincronizacao } from "../../../../disparar-sync";
import { pedirRemocao } from "../../../../fotos-enviadas";
import { registrar } from "../../../../nomes-corrigidos";
import { carregarCatalogoCompleto, slugify } from "../../../../nacoes-unidas/produtos/catalogo";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Tira a foto de um produto (foto errada). A foto some da loja na hora e o arquivo é removido na próxima publicação. Só equipe logada. */
export async function POST(request: Request) {
  let ean = "";
  let nome = "";
  let por = "";
  try {
    const c = (await request.json()) as { ean?: unknown; nome?: unknown };
    ean = typeof c.ean === "string" ? c.ean.trim() : "";
    nome = typeof c.nome === "string" ? c.nome.replace(/\s+/g, " ").trim() : "";
    por = typeof (c as { por?: unknown }).por === "string" ? String((c as { por: string }).por).replace(/\s+/g, " ").trim().slice(0, 60) : "";
  } catch {
    // corpo inválido
  }
  if (!/^\d{8,14}$/.test(ean) || !nome || nome.length > 200) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const slug = slugify(nome);
  const temPagina = carregarCatalogoCompleto().itens.some((i) => slugify(i.nome) === slug);
  await pedirRemocao(db, ean, nome, temPagina ? slug : null);
  await registrar(db, { tipo: "foto", chave: ean, titulo: nome, acao: "tirou a foto", por: por || "não informado" }).catch(() => undefined);
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, publicando }, { headers: SEM_CACHE });
}
