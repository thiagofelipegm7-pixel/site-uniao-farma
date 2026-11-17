import { banco } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type ItemPreVenda = { nome: string; quantidade: number; precoCentavos: number };
type LinhaPreVenda = {
  id: string;
  codigo: string;
  unidade: string;
  modo: "retirar" | "casa";
  itens_json: string;
  total_centavos: number;
  status: "nova" | "atendimento" | "concluida" | "cancelada";
  criado_em: string;
};
type Statement = {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
};
type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): Statement;
};

async function prepararTabela(db: Banco) {
  await db.exec(`CREATE TABLE IF NOT EXISTS pre_venda (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL UNIQUE,
    codigo TEXT NOT NULL,
    unidade TEXT NOT NULL,
    modo TEXT NOT NULL,
    itens_json TEXT NOT NULL,
    total_centavos INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'nova',
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`);
  await db.exec("CREATE INDEX IF NOT EXISTS pre_venda_criado_em ON pre_venda (criado_em DESC)");
}

/** Lista interna protegida pelo middleware de autenticação da equipe. */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  await prepararTabela(db);
  const limite = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await db.prepare("DELETE FROM pre_venda WHERE criado_em < ?").bind(limite).run();
  const { results } = await db.prepare("SELECT id, codigo, unidade, modo, itens_json, total_centavos, status, criado_em FROM pre_venda WHERE criado_em >= ? ORDER BY criado_em DESC LIMIT 500")
    .bind(limite).all<LinhaPreVenda>();
  const itens = results.flatMap((linha) => {
    let produtos: ItemPreVenda[];
    try {
      const parsed: unknown = JSON.parse(linha.itens_json);
      if (!Array.isArray(parsed) || parsed.length > 40) return [];
      produtos = parsed.filter((item): item is ItemPreVenda => Boolean(
        item && typeof item.nome === "string" && Number.isInteger(item.quantidade) && Number.isInteger(item.precoCentavos),
      ));
    } catch {
      return [];
    }
    const status = ["nova", "atendimento", "concluida", "cancelada"].includes(linha.status) ? linha.status : "nova";
    return [{ id: linha.id, codigo: linha.codigo, unidade: linha.unidade, modo: linha.modo, itens: produtos, totalCentavos: Number(linha.total_centavos) || 0, status, criadoEm: linha.criado_em }];
  });
  return Response.json({ ok: true, preVendas: itens }, { headers: SEM_CACHE });
}

/** Atualiza o andamento após a equipe localizar a conversa pelo código curto. */
export async function PATCH(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id.trim() : "";
  const status = corpo?.status;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["nova", "atendimento", "concluida", "cancelada"].includes(String(status))) {
    return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  await prepararTabela(db);
  const resultado = await db.prepare("UPDATE pre_venda SET status = ?, atualizado_em = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id).run();
  if (!resultado.meta?.changes) return Response.json({ ok: false, erro: "nao_encontrada" }, { status: 404, headers: SEM_CACHE });
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
