import { banco } from "../../../estoque-fonte";
import { geocodificar, normalizarEndereco } from "../../../geocodificar";
import {
  COLETA_LOJA,
  ErroLalamove,
  cancelarPedido,
  chamarEntregador,
  consultarEntregador,
  consultarPedido,
  cotarEntrega,
  lalamoveConfigurado,
  lalamoveModoTeste,
  mensagemErroLalamove,
  telefoneE164,
} from "../../../lalamove";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
// Nome, telefone e endereço do cliente ficam no máximo 90 dias, como as pré-vendas.
const RETENCAO_MS = 90 * 86_400_000;

type Statement = {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
};
type Banco = { exec(sql: string): Promise<unknown>; prepare(sql: string): Statement };

type Linha = {
  id: string;
  pre_venda_id: string | null;
  codigo: string | null;
  endereco: string;
  complemento: string | null;
  encontrado: string | null;
  lat: number;
  lng: number;
  quotation_id: string | null;
  stop_coleta: string | null;
  stop_entrega: string | null;
  preco_total: string | null;
  moeda: string | null;
  preco_json: string | null;
  distancia_m: number | null;
  cotacao_expira_em: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  order_id: string | null;
  status: string;
  driver_id: string | null;
  driver_nome: string | null;
  driver_telefone: string | null;
  driver_placa: string | null;
  share_link: string | null;
  sandbox: number;
  erro: string | null;
  criado_em: string;
  atualizado_em: string;
};

async function prepararTabela(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS entrega_lalamove (id TEXT PRIMARY KEY, pre_venda_id TEXT, codigo TEXT, endereco TEXT NOT NULL, complemento TEXT, encontrado TEXT, lat REAL NOT NULL, lng REAL NOT NULL, quotation_id TEXT, stop_coleta TEXT, stop_entrega TEXT, preco_total TEXT, moeda TEXT, preco_json TEXT, distancia_m INTEGER, cotacao_expira_em TEXT, cliente_nome TEXT, cliente_telefone TEXT, order_id TEXT, status TEXT NOT NULL DEFAULT 'cotada', driver_id TEXT, driver_nome TEXT, driver_telefone TEXT, driver_placa TEXT, share_link TEXT, sandbox INTEGER NOT NULL DEFAULT 1, erro TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)");
  await db.exec("CREATE INDEX IF NOT EXISTS entrega_lalamove_criado_em ON entrega_lalamove (criado_em DESC)");
}

function publico(l: Linha) {
  let precoDetalhe: Record<string, unknown> | null = null;
  try {
    precoDetalhe = l.preco_json ? (JSON.parse(l.preco_json) as Record<string, unknown>) : null;
  } catch {
    precoDetalhe = null;
  }
  return {
    id: l.id,
    preVendaId: l.pre_venda_id,
    codigo: l.codigo,
    endereco: l.endereco,
    complemento: l.complemento,
    encontrado: l.encontrado,
    lat: l.lat,
    lng: l.lng,
    precoTotal: l.preco_total,
    moeda: l.moeda,
    precoDetalhe,
    distanciaM: l.distancia_m,
    cotacaoExpiraEm: l.cotacao_expira_em,
    clienteNome: l.cliente_nome,
    clienteTelefone: l.cliente_telefone,
    orderId: l.order_id,
    status: l.status,
    entregador: l.driver_id ? { id: l.driver_id, nome: l.driver_nome, telefone: l.driver_telefone, placa: l.driver_placa } : null,
    shareLink: l.share_link,
    sandbox: Boolean(l.sandbox),
    erro: l.erro,
    criadoEm: l.criado_em,
    atualizadoEm: l.atualizado_em,
  };
}

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: SEM_CACHE });
const falha = (erro: string, mensagem: string, status: number) => json({ ok: false, erro, mensagem }, status);

function erroDaLalamove(e: unknown) {
  if (e instanceof ErroLalamove) {
    const status = e.status === 503 ? 503 : e.status === 402 || e.status === 409 || e.status === 429 ? e.status : e.status >= 400 && e.status < 500 ? 422 : 502;
    return falha(e.codigo, mensagemErroLalamove(e.codigo), status);
  }
  return falha("falha_lalamove", "Não foi possível falar com a Lalamove agora. Tente de novo em instantes.", 502);
}

async function buscar(db: Banco, id: string) {
  return db.prepare("SELECT * FROM entrega_lalamove WHERE id = ?").bind(id).first<Linha>();
}

const ID_VALIDO = /^[0-9a-f-]{36}$/i;
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function GET(request: Request) {
  const configurado = lalamoveConfigurado();
  const base = { configurado, sandbox: lalamoveModoTeste(), coleta: { nome: COLETA_LOJA.nome, endereco: COLETA_LOJA.endereco } };
  const db = banco() as Banco | null;
  if (!db) return json({ ok: false, erro: "sem_banco", ...base, entregas: [] }, 503);
  await prepararTabela(db);
  await db.prepare("DELETE FROM entrega_lalamove WHERE criado_em < ?").bind(new Date(Date.now() - RETENCAO_MS).toISOString()).run();
  const { results } = await db.prepare("SELECT * FROM entrega_lalamove WHERE order_id IS NOT NULL ORDER BY criado_em DESC LIMIT 100").all<Linha>();

  // Pré-venda de origem (?pv=<id>): só o código curto e o resumo, para a equipe achar a conversa no WhatsApp.
  let preVenda: { id: string; codigo: string; modo: string; totalCentavos: number } | null = null;
  const pv = new URL(request.url).searchParams.get("pv") || "";
  if (ID_VALIDO.test(pv)) {
    try {
      preVenda = await db.prepare("SELECT id, codigo, modo, total_centavos AS totalCentavos FROM pre_venda WHERE id = ?").bind(pv).first();
    } catch {
      preVenda = null;
    }
  }
  return json({ ok: true, ...base, entregas: results.map(publico), preVenda });
}

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const acao = corpo?.acao;
  if (!corpo || typeof acao !== "string") return falha("pedido_invalido", "Pedido inválido.", 400);
  if (!lalamoveConfigurado()) return falha("nao_configurado", "Integração Lalamove não configurada.", 503);
  const db = banco() as Banco | null;
  if (!db) return falha("sem_banco", "Banco indisponível.", 503);
  await prepararTabela(db);
  const agora = new Date().toISOString();

  if (acao === "cotar") {
    const endereco = normalizarEndereco(texto(corpo.endereco, 300));
    const complemento = texto(corpo.complemento, 300);
    if (endereco.length < 6) return falha("endereco_invalido", "Informe o endereço do cliente (rua, número e bairro).", 400);
    let lat = Number(corpo.lat);
    let lng = Number(corpo.lng);
    let encontrado = "";
    const manual = corpo.lat !== undefined && corpo.lat !== "" && corpo.lng !== undefined && corpo.lng !== "";
    if (manual) {
      // Correção manual da equipe: só aceita pontos na região de Sabará/BH.
      if (!(lat < -19.6 && lat > -20.1 && lng < -43.5 && lng > -44.2)) return falha("coordenada_invalida", "Coordenadas fora da região de Sabará/BH.", 400);
      encontrado = "Ponto informado pela equipe";
    } else {
      const local = await geocodificar(endereco, db).catch(() => null);
      if (!local) return falha("endereco_nao_encontrado", "Não achei esse endereço no mapa. Confira rua, número e bairro, ou informe as coordenadas.", 422);
      ({ lat, lng, encontrado } = local);
    }
    let cotacao;
    try {
      cotacao = await cotarEntrega({ lat, lng, endereco: complemento ? `${endereco} (${complemento})` : endereco });
    } catch (e) {
      return erroDaLalamove(e);
    }
    const preVendaId = ID_VALIDO.test(texto(corpo.preVendaId, 36)) ? texto(corpo.preVendaId, 36) : null;
    const codigo = /^[A-Z0-9]{4}$/.test(texto(corpo.codigo, 4).toUpperCase()) ? texto(corpo.codigo, 4).toUpperCase() : null;
    const id = crypto.randomUUID();
    const preco = cotacao.priceBreakdown ?? {};
    const distancia = Number(cotacao.distance?.value);
    await db.prepare("INSERT INTO entrega_lalamove (id, pre_venda_id, codigo, endereco, complemento, encontrado, lat, lng, quotation_id, stop_coleta, stop_entrega, preco_total, moeda, preco_json, distancia_m, cotacao_expira_em, status, sandbox, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cotada', ?, ?, ?)")
      .bind(id, preVendaId, codigo, endereco, complemento || null, encontrado, lat, lng, cotacao.quotationId, cotacao.stops[0].stopId, cotacao.stops[1].stopId,
        typeof preco.total === "string" ? preco.total : null, typeof preco.currency === "string" ? preco.currency : null, JSON.stringify(preco),
        Number.isFinite(distancia) ? Math.round(distancia) : null, cotacao.expiresAt ?? null, lalamoveModoTeste() ? 1 : 0, agora, agora).run();
    const linha = await buscar(db, id);
    return json({ ok: true, entrega: linha ? publico(linha) : null }, 201);
  }

  const id = texto(corpo.id, 36);
  if (!ID_VALIDO.test(id)) return falha("pedido_invalido", "Entrega inválida.", 400);
  const linha = await buscar(db, id);
  if (!linha) return falha("nao_encontrada", "Entrega não encontrada.", 404);

  if (acao === "chamar") {
    if (linha.order_id) return falha("ja_chamado", "Essa entrega já foi chamada.", 409);
    const nome = texto(corpo.nome, 80);
    const telefone = telefoneE164(texto(corpo.telefone, 30));
    if (nome.length < 2) return falha("nome_invalido", "Informe o nome de quem vai receber.", 400);
    if (!telefone) return falha("telefone_invalido", "Telefone inválido. Use DDD + número, por exemplo (31) 99999-9999.", 400);
    if (linha.cotacao_expira_em && Date.parse(linha.cotacao_expira_em) < Date.now()) return falha("ERR_QUOTATION_EXPIRED", mensagemErroLalamove("ERR_QUOTATION_EXPIRED"), 409);
    let pedido;
    try {
      pedido = await chamarEntregador({
        quotationId: String(linha.quotation_id),
        stopColeta: String(linha.stop_coleta),
        stopEntrega: String(linha.stop_entrega),
        nome,
        telefone,
        observacao: [linha.complemento, linha.codigo ? `Pedido ${linha.codigo}` : ""].filter(Boolean).join("\r\n") || undefined,
        metadata: { origem: "site-uniao-farma", entregaId: linha.id, ...(linha.codigo ? { codigo: linha.codigo } : {}) },
      });
    } catch (e) {
      return erroDaLalamove(e);
    }
    const preco = pedido.priceBreakdown;
    await db.prepare("UPDATE entrega_lalamove SET cliente_nome = ?, cliente_telefone = ?, order_id = ?, status = ?, driver_id = ?, share_link = ?, preco_total = COALESCE(?, preco_total), moeda = COALESCE(?, moeda), preco_json = COALESCE(?, preco_json), erro = NULL, atualizado_em = ? WHERE id = ?")
      .bind(nome, telefone, pedido.orderId, pedido.status || "ASSIGNING_DRIVER", pedido.driverId || null, pedido.shareLink || null,
        typeof preco?.total === "string" ? preco.total : null, typeof preco?.currency === "string" ? preco.currency : null, preco ? JSON.stringify(preco) : null, agora, id).run();
  } else if (acao === "atualizar") {
    if (!linha.order_id) return falha("sem_pedido", "Essa entrega ainda não foi chamada.", 409);
    let pedido;
    try {
      pedido = await consultarPedido(linha.order_id);
    } catch (e) {
      return erroDaLalamove(e);
    }
    const driverId = pedido?.driverId || "";
    let entregador: { name?: string; phone?: string; plateNumber?: string } | null = null;
    if (driverId) {
      // Os dados do entregador só ficam disponíveis depois que ele aceita; até lá a Lalamove responde erro.
      entregador = await consultarEntregador(linha.order_id, driverId).catch(() => null);
    }
    await db.prepare("UPDATE entrega_lalamove SET status = ?, driver_id = ?, driver_nome = COALESCE(?, driver_nome), driver_telefone = COALESCE(?, driver_telefone), driver_placa = COALESCE(?, driver_placa), share_link = COALESCE(?, share_link), erro = NULL, atualizado_em = ? WHERE id = ?")
      .bind(pedido?.status || linha.status, driverId || null, entregador?.name || null, entregador?.phone || null, entregador?.plateNumber || null, pedido?.shareLink || null, agora, id).run();
  } else if (acao === "cancelar") {
    if (!linha.order_id) return falha("sem_pedido", "Essa entrega ainda não foi chamada.", 409);
    try {
      await cancelarPedido(linha.order_id);
    } catch (e) {
      return erroDaLalamove(e);
    }
    await db.prepare("UPDATE entrega_lalamove SET status = 'CANCELED', atualizado_em = ? WHERE id = ?").bind(agora, id).run();
  } else {
    return falha("acao_invalida", "Ação inválida.", 400);
  }
  const atualizada = await buscar(db, id);
  return json({ ok: true, entrega: atualizada ? publico(atualizada) : null });
}
