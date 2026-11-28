import { banco } from "../../../estoque-fonte";
import { EIXOS_SUGERIDOS, grupoDoProduto, removerGrupo, salvarGrupo } from "../../../variacoes-produto";
import { produtoPorCodigo } from "../../../variacoes-resolver";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banco = Parameters<typeof grupoDoProduto>[0];

/** Devolve o grupo com o nome e o preço de cada produto, para o painel mostrar. */
async function grupoParaPainel(db: Banco, ean: string) {
  const grupo = await grupoDoProduto(db, ean);
  if (!grupo) return null;
  return {
    eixo: grupo.eixo,
    itens: grupo.itens.map((i) => {
      const p = produtoPorCodigo(i.ean);
      return { ean: i.ean, rotulo: i.rotulo, nome: p?.nome ?? "Produto fora do catálogo", precoCentavos: p?.precoCentavos ?? 0, esgotado: p?.esgotado ?? false };
    }),
  };
}

/**
 * GET ?ean=... → variações cadastradas para esse produto (grupo com tamanhos, cores etc.), ou null.
 * POST { acao: "salvar", ean, eixo, itens: [{ ean, rotulo }] } | { acao: "remover", ean }
 * (A senha da equipe é pedida pelo middleware de /api/interno.)
 */
export async function GET(request: Request) {
  const ean = new URL(request.url).searchParams.get("ean") ?? "";
  if (!/^\d{8,14}$/.test(ean)) return Response.json({ ok: false, erro: "ean_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  return Response.json({ ok: true, eixos: EIXOS_SUGERIDOS, grupo: await grupoParaPainel(db, ean) }, { headers: SEM_CACHE });
}

export async function POST(request: Request) {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  let corpo: { acao?: string; ean?: string; eixo?: unknown; itens?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const ean = typeof corpo.ean === "string" ? corpo.ean : "";
  if (!/^\d{8,14}$/.test(ean)) return Response.json({ ok: false, erro: "ean_invalido" }, { status: 400, headers: SEM_CACHE });

  if (corpo.acao === "remover") {
    const r = await removerGrupo(db, ean);
    return Response.json({ ...r, grupo: null }, { status: r.ok ? 200 : 422, headers: SEM_CACHE });
  }
  if (corpo.acao === "salvar") {
    // Só produtos que existem no catálogo entram no grupo.
    if (Array.isArray(corpo.itens) && corpo.itens.some((i) => !i || typeof i !== "object" || !produtoPorCodigo(String((i as { ean?: unknown }).ean ?? "")))) {
      return Response.json({ ok: false, erro: "produto_inexistente" }, { status: 422, headers: SEM_CACHE });
    }
    const r = await salvarGrupo(db, ean, corpo.eixo, corpo.itens);
    if (!r.ok) return Response.json(r, { status: 422, headers: SEM_CACHE });
    return Response.json({ ok: true, grupo: await grupoParaPainel(db, ean) }, { headers: SEM_CACHE });
  }
  return Response.json({ ok: false, erro: "acao_invalida" }, { status: 400, headers: SEM_CACHE });
}
