import { mapaDeCategorias } from "../../categoria-override";
import {
  cestaPodeSerLembrada,
  gravarCestaEsquecida,
  itensParaRetomada,
  origemPermitida,
  validarConsentimentoCesta,
  validarItensCesta,
} from "../../cesta-esquecida";
import { banco } from "../../estoque-fonte";
import { corpoPreVendaGrandeDemais, permitirPreVenda, respostaLimitePreVenda, type BancoLimite } from "../../limite-visitante";
import { carregarCatalogoCompleto } from "../../nacoes-unidas/produtos/catalogo";
import { mapaDeNomes, type Banco } from "../../nomes-corrigidos";
import { criarClassificador } from "../../recompra";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

async function classificador(db: Banco | null) {
  const [nomes, categorias] = await Promise.all([
    db ? mapaDeNomes(db).catch(() => ({})) : Promise.resolve({}),
    db ? mapaDeCategorias(db).catch(() => ({})) : Promise.resolve({}),
  ]);
  return criarClassificador(carregarCatalogoCompleto().itens, nomes, categorias);
}

/**
 * POST: guarda a cesta (com consentimento) para a equipe avisar depois se o pedido não fechar.
 * GET: devolve só os itens para retomar, sem nome e sem telefone.
 */
export async function POST(request: Request) {
  const tamanho = Number(request.headers.get("content-length") || 0);
  if (corpoPreVendaGrandeDemais(tamanho)) return Response.json({ ok: false, erro: "pedido_grande" }, { status: 413, headers: SEM_CACHE });
  if (!origemPermitida(request)) return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
  if (!(await permitirPreVenda(request, banco() as BancoLimite | null))) return respostaLimitePreVenda();

  const bruto = await request.text().catch(() => "");
  if (corpoPreVendaGrandeDemais(bruto.length)) return Response.json({ ok: false, erro: "pedido_grande" }, { status: 413, headers: SEM_CACHE });
  let entrada: { requestId?: unknown; consentimento?: unknown; itens?: unknown } | null = null;
  try {
    entrada = bruto ? (JSON.parse(bruto) as { requestId?: unknown; consentimento?: unknown; itens?: unknown }) : null;
  } catch {
    entrada = null;
  }
  const requestId = typeof entrada?.requestId === "string" ? entrada.requestId.trim() : "";
  const consentimento = validarConsentimentoCesta(entrada?.consentimento);
  const itens = validarItensCesta(entrada?.itens);
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !consentimento || !itens) {
    return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  }

  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const classificar = await classificador(db);
  if (!cestaPodeSerLembrada(itens, classificar).ok) {
    return Response.json({ ok: false, erro: "medicamento" }, { status: 422, headers: SEM_CACHE });
  }
  try {
    const gravada = await gravarCestaEsquecida(db, { requestId, consentimento, itens, classificar }, new Date());
    if (!gravada.ok) return Response.json({ ok: false, erro: gravada.motivo }, { status: gravada.motivo === "medicamento" ? 422 : 409, headers: SEM_CACHE });
    return Response.json({ ok: true, id: gravada.id }, { status: 201, headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_gravar" }, { status: 503, headers: SEM_CACHE });
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("cesta") ?? new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  try {
    const itens = await itensParaRetomada(db, id, new Date());
    if (!itens) return Response.json({ ok: false, erro: "nao_encontrada" }, { status: 404, headers: SEM_CACHE });
    return Response.json({ ok: true, itens }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_ler" }, { status: 503, headers: SEM_CACHE });
  }
}
