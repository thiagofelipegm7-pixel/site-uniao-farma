import { mapaDeCategorias } from "../../../categoria-override";
import { banco } from "../../../estoque-fonte";
import { carregarCatalogoCompleto } from "../../../nacoes-unidas/produtos/catalogo";
import { mapaDeNomes, type Banco } from "../../../nomes-corrigidos";
import { criarClassificador, lerListaRecompra, marcarRecompra } from "../../../recompra";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

async function classificador(db: Banco) {
  const [nomes, categorias] = await Promise.all([mapaDeNomes(db).catch(() => ({})), mapaDeCategorias(db).catch(() => ({}))]);
  return criarClassificador(carregarCatalogoCompleto().itens, nomes, categorias);
}

/** Lista de lembretes de recompra do dia. Só equipe logada: o middleware protege todo /api/interno/. */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS pre_venda (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, codigo TEXT NOT NULL, unidade TEXT NOT NULL, modo TEXT NOT NULL, itens_json TEXT NOT NULL, total_centavos INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'nova', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)");
    return Response.json({ ok: true, ...(await lerListaRecompra(db, Date.now(), await classificador(db))) }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_ler" }, { status: 503, headers: SEM_CACHE });
  }
}

/** Marca um lembrete como enviado (o operador mandou pelo WhatsApp) ou registra que o cliente não quer mais (SAIR). */
export async function PATCH(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { id?: unknown; acao?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id.trim() : "";
  const acao = corpo?.acao;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (acao !== "enviado" && acao !== "optout")) {
    return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const ok = await marcarRecompra(db, id, acao, new Date());
  if (!ok) return Response.json({ ok: false, erro: "nao_encontrado" }, { status: 404, headers: SEM_CACHE });
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
