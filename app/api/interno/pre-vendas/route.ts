import { banco } from "../../../estoque-fonte";
import type { Banco as BancoCompleto } from "../../../nomes-corrigidos";
import { garantirColunasRetirada } from "../../../retirada";
import { nomeDeExibicao } from "../../../nome-exibicao";
import { acharPorSlug, carregarCatalogoNacoes, slugify } from "../../../nacoes-unidas/produtos/catalogo";
import {
  aplicarEdicao,
  avisoEntrega,
  garantirColunasEdicao,
  HISTORICO_MAX,
  lerEntregasLigadas,
  lerHistorico,
  lerItens,
  linkPedidoAtualizado,
  mensagemPedidoAtualizado,
  motivoBloqueio,
  validarAutor,
  type ItemCatalogoPedido,
} from "../../../pedido-edicao";

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
  atualizado_em: string;
  aviso_telefone: string | null;
  editado_em: string | null;
  editado_por: string | null;
  edicoes_json: string | null;
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
  await db.exec("CREATE TABLE IF NOT EXISTS pre_venda (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, codigo TEXT NOT NULL, unidade TEXT NOT NULL, modo TEXT NOT NULL, itens_json TEXT NOT NULL, total_centavos INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'nova', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)");
  await db.exec("CREATE INDEX IF NOT EXISTS pre_venda_criado_em ON pre_venda (criado_em DESC)");
}

/** Lista interna protegida pelo middleware de autenticação da equipe. */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  await prepararTabela(db);
  await garantirColunasRetirada(db as unknown as BancoCompleto);
  await garantirColunasEdicao(db as unknown as BancoCompleto);
  const limite = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await db.prepare("DELETE FROM pre_venda WHERE criado_em < ?").bind(limite).run();
  const { results } = await db.prepare("SELECT id, codigo, unidade, modo, itens_json, total_centavos, status, criado_em, atualizado_em, aviso_telefone, editado_em, editado_por, edicoes_json FROM pre_venda WHERE criado_em >= ? ORDER BY criado_em DESC LIMIT 500")
    .bind(limite).all<LinhaPreVenda>();
  const abertas = results.filter((l) => l.status === "nova" || l.status === "atendimento").map((l) => l.id);
  const entregas = await lerEntregasLigadas(db as unknown as BancoCompleto, abertas);
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
    const totalCentavos = Number(linha.total_centavos) || 0;
    const ligadas = entregas.get(linha.id) ?? [];
    const bloqueio = motivoBloqueio(status, ligadas);
    const editadoEm = typeof linha.editado_em === "string" && linha.editado_em ? linha.editado_em : null;
    const aberta = status === "nova" || status === "atendimento";
    const linkResumo = editadoEm && aberta
      ? linkPedidoAtualizado(linha.aviso_telefone ?? null, mensagemPedidoAtualizado({ codigo: linha.codigo, unidade: linha.unidade, modo: linha.modo, itens: produtos, totalCentavos }))
      : null;
    return [{
      id: linha.id,
      codigo: linha.codigo,
      unidade: linha.unidade,
      modo: linha.modo,
      itens: produtos,
      totalCentavos,
      status,
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
      editadoEm,
      editadoPor: editadoEm ? linha.editado_por || null : null,
      historico: lerHistorico(linha.edicoes_json),
      edicao: { bloqueio, aviso: bloqueio ? null : avisoEntrega(ligadas) },
      linkResumo,
      temWhatsapp: Boolean(linha.aviso_telefone),
    }];
  });
  return Response.json({ ok: true, preVendas: itens }, { headers: SEM_CACHE });
}

const ERROS_EDICAO: Record<string, string> = {
  item_invalido: "Algum item ficou inválido. Confira as quantidades (de 1 a 20) e tente de novo.",
  sem_itens: "O pedido não pode ficar sem itens. Se o cliente desistiu de tudo, mude o andamento para \"Não fechou\".",
  muitos_itens: "O pedido pode ter no máximo 40 produtos diferentes.",
  nao_encontrado_catalogo: "Um produto incluído não está mais no catálogo do site. Busque de novo.",
  total_invalido: "O total ficou inválido. Confira as quantidades.",
  sem_mudanca: "Nada mudou no pedido.",
  autor: "Diga quem está alterando (seu nome, 2 a 40 letras).",
  bloqueado: "Este pedido não pode mais ser alterado.",
  mudou: "O pedido mudou enquanto você editava (andamento ou itens). Toque em Atualizar e faça a alteração de novo.",
  nao_encontrada: "Pedido não encontrado.",
};

/** Catálogo do site (mesmo da busca do cabeçalho): nome de exibição e preço do dia, sem esgotados. */
function itemDoCatalogo(slug: string): ItemCatalogoPedido | null {
  const achado = acharPorSlug(carregarCatalogoNacoes().itens, slug);
  if (!achado) return null;
  return { slug: slugify(achado.nome), nome: nomeDeExibicao(achado.nome), precoCentavos: Math.round(achado.preco * 100) };
}

/**
 * A equipe altera os itens do pedido (tirar produto, mudar quantidade, incluir do catálogo).
 * Corpo: { id, atualizadoEm, por, itens: [{ indice, quantidade } | { slug, quantidade }] }. Preço nunca vem do navegador.
 */
export async function PUT(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { id?: unknown; atualizadoEm?: unknown; por?: unknown; itens?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id.trim() : "";
  const versao = typeof corpo?.atualizadoEm === "string" ? corpo.atualizadoEm : "";
  const falhar = (erro: string, status: number, extra: Record<string, unknown> = {}) => Response.json({ ok: false, erro, mensagem: ERROS_EDICAO[erro] ?? "Não foi possível salvar.", ...extra }, { status, headers: SEM_CACHE });
  if (!/^[0-9a-f-]{36}$/i.test(id) || !versao) return falhar("item_invalido", 400);
  const por = validarAutor(corpo?.por);
  if (!por) return falhar("autor", 400);
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  await prepararTabela(db);
  const completo = db as unknown as BancoCompleto;
  await garantirColunasRetirada(completo);
  await garantirColunasEdicao(completo);
  const linha = await completo.prepare("SELECT id, status, itens_json, total_centavos, atualizado_em, edicoes_json FROM pre_venda WHERE id = ?").bind(id)
    .first<{ id: string; status: string; itens_json: string; total_centavos: number; atualizado_em: string; edicoes_json: string | null }>();
  if (!linha) return falhar("nao_encontrada", 404);
  if (linha.atualizado_em !== versao) return falhar("mudou", 409);
  const bloqueio = motivoBloqueio(linha.status, (await lerEntregasLigadas(completo, [id])).get(id) ?? []);
  if (bloqueio) return falhar("bloqueado", 409, { mensagem: bloqueio });

  const atuais = lerItens(linha.itens_json);
  const resultado = aplicarEdicao(atuais, corpo?.itens, itemDoCatalogo);
  if (!resultado.ok) return falhar(resultado.erro, 400);

  const agora = new Date().toISOString();
  const historico = [...lerHistorico(linha.edicoes_json), { em: agora, por, antesCentavos: Number(linha.total_centavos) || 0, depoisCentavos: resultado.totalCentavos, mudancas: resultado.mudancas.slice(0, 40) }].slice(-HISTORICO_MAX);
  // Só grava se ninguém mexeu no pedido desde a leitura e se ele continua em aberto.
  const gravado = await db.prepare("UPDATE pre_venda SET itens_json = ?, total_centavos = ?, atualizado_em = ?, editado_em = ?, editado_por = ?, edicoes_json = ? WHERE id = ? AND atualizado_em = ? AND status IN ('nova', 'atendimento')")
    .bind(JSON.stringify(resultado.itens), resultado.totalCentavos, agora, agora, por, JSON.stringify(historico), id, versao).run();
  if (!gravado.meta?.changes) return falhar("mudou", 409);
  return Response.json({ ok: true, totalCentavos: resultado.totalCentavos, itens: resultado.itens, mudancas: resultado.mudancas, editadoEm: agora }, { headers: SEM_CACHE });
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
  await garantirColunasRetirada(db as unknown as BancoCompleto);
  // Concluída ou cancelada: o WhatsApp do aviso de retirada não serve mais e é apagado.
  const encerrada = status === "concluida" || status === "cancelada";
  const resultado = await db.prepare(`UPDATE pre_venda SET status = ?, atualizado_em = ?${encerrada ? ", aviso_telefone = NULL" : ""} WHERE id = ?`)
    .bind(status, new Date().toISOString(), id).run();
  if (!resultado.meta?.changes) return Response.json({ ok: false, erro: "nao_encontrada" }, { status: 404, headers: SEM_CACHE });
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
