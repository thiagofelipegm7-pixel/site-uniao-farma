import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "cache-control": "no-store" };
const UNIDADES = new Set(["fatima", "nacoes", "itacolomi"]);
const MODOS = new Set(["retirar", "casa"]);

type ItemEntrada = { nome?: unknown; quantidade?: unknown; precoCentavos?: unknown };
type Entrada = {
  requestId?: unknown;
  codigo?: unknown;
  unidade?: unknown;
  modo?: unknown;
  itens?: unknown;
};
type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
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

/** Grava só um resumo da cesta quando o cliente abre o WhatsApp. Sem nome, telefone, endereço ou pagamento. */
export async function POST(request: Request) {
  const tamanho = Number(request.headers.get("content-length") || 0);
  if (tamanho > 16_000) return Response.json({ ok: false, erro: "pedido_grande" }, { status: 413, headers: SEM_CACHE });

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
    } catch {
      return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
    }
  }

  const entrada = (await request.json().catch(() => null)) as Entrada | null;
  if (!entrada || typeof entrada !== "object") return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const requestId = typeof entrada.requestId === "string" ? entrada.requestId.trim() : "";
  const codigo = typeof entrada.codigo === "string" ? entrada.codigo.trim().toUpperCase() : "";
  const unidade = typeof entrada.unidade === "string" ? entrada.unidade : "";
  const modo = typeof entrada.modo === "string" ? entrada.modo : "";
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[A-Z0-9]{4}$/.test(codigo) || !UNIDADES.has(unidade) || !MODOS.has(modo) || !Array.isArray(entrada.itens) || entrada.itens.length < 1 || entrada.itens.length > 40) {
    return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  }

  const itens: Array<{ nome: string; quantidade: number; precoCentavos: number }> = [];
  for (const valor of entrada.itens as ItemEntrada[]) {
    const nome = typeof valor?.nome === "string" ? valor.nome.replace(/\s+/g, " ").trim().slice(0, 180) : "";
    const quantidade = valor?.quantidade;
    const precoCentavos = valor?.precoCentavos;
    if (!nome || !Number.isInteger(quantidade) || Number(quantidade) < 1 || Number(quantidade) > 20 || !Number.isInteger(precoCentavos) || Number(precoCentavos) < 1 || Number(precoCentavos) > 10_000_000) {
      return Response.json({ ok: false, erro: "item_invalido" }, { status: 400, headers: SEM_CACHE });
    }
    itens.push({ nome, quantidade: Number(quantidade), precoCentavos: Number(precoCentavos) });
  }
  const total = itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
  if (!Number.isSafeInteger(total) || total > 500_000_000) return Response.json({ ok: false, erro: "total_invalido" }, { status: 400, headers: SEM_CACHE });

  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const agora = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await prepararTabela(db);
    // Retém no máximo 90 dias de itens de cesta, que podem revelar informações sensíveis de saúde.
    const limite = new Date(Date.now() - 90 * 86_400_000).toISOString();
    await db.prepare("DELETE FROM pre_venda WHERE criado_em < ?").bind(limite).run();
    await db.prepare("INSERT OR IGNORE INTO pre_venda (id, request_id, codigo, unidade, modo, itens_json, total_centavos, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 'nova', ?, ?)")
      .bind(id, requestId, codigo, unidade, modo, JSON.stringify(itens), total, agora, agora).run();
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_gravar" }, { status: 503, headers: SEM_CACHE });
  }
  return Response.json({ ok: true }, { status: 201, headers: SEM_CACHE });
}
