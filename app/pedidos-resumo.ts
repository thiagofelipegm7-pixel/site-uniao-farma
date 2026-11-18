/**
 * Painel de pedidos (/interno/pedidos): resumo das cestas do site (tabela pre_venda do D1) por dia, 7 e 30 dias.
 * O site não cobra nada: cada registro é uma cesta que o cliente fechou e mandou para o WhatsApp da loja, com os preços do site
 * na hora. Venda de verdade é só o que a equipe marca como "Venda concluída" em /interno/pre-vendas. Nada aqui identifica cliente.
 * Módulo sem Cloudflare (testável).
 */
import { topBuscas, type LinhaBusca } from "./busca-sem-resultado";
import type { Banco } from "./nomes-corrigidos";

export type ItemPedido = { nome: string; quantidade: number; precoCentavos: number };
export type StatusPedido = "nova" | "atendimento" | "concluida" | "cancelada";
export type Pedido = { criadoEm: string; itens: ItemPedido[]; totalCentavos: number | null; status: StatusPedido };

export const PERIODOS = [
  { chave: "hoje", rotulo: "Hoje", dias: 1 },
  { chave: "7d", rotulo: "Últimos 7 dias", dias: 7 },
  { chave: "30d", rotulo: "Últimos 30 dias", dias: 30 },
] as const;
export type ChavePeriodo = (typeof PERIODOS)[number]["chave"];

export type ProdutoVendido = { nome: string; quantidade: number; pedidos: number };
export type ResumoPeriodo = {
  chave: ChavePeriodo;
  rotulo: string;
  desde: string;
  pedidos: number;
  concluidos: number;
  cancelados: number;
  emAberto: number;
  /** Soma das cestas não canceladas (preço do site na hora). null se nenhuma cesta tem valor guardado. */
  valorCestasCentavos: number | null;
  /** Soma só das vendas marcadas como concluídas. null se não há venda concluída com valor. */
  faturamentoCentavos: number | null;
  maisVendidos: ProdutoVendido[];
};

const FUSO_MS = 3 * 3_600_000; // Brasília, UTC-3 (sem horário de verão desde 2019)

/** "AAAA-MM-DD" do dia em Brasília. */
export function diaBrasilia(ms: number): string {
  return new Date(ms - FUSO_MS).toISOString().slice(0, 10);
}

/** Instante (ms, UTC) da meia-noite de Brasília do dia `dias - 1` antes de hoje: "hoje" começa à 0h de hoje. */
export function inicioPeriodo(agoraMs: number, dias: number): number {
  const hoje = diaBrasilia(agoraMs);
  return Date.parse(`${hoje}T00:00:00-03:00`) - (dias - 1) * 86_400_000;
}

/** Valida uma linha crua do banco. Linha estranha vira null (não quebra o painel). */
export function lerPedido(linha: { criado_em?: unknown; itens_json?: unknown; total_centavos?: unknown; status?: unknown }): Pedido | null {
  if (typeof linha.criado_em !== "string" || !Number.isFinite(Date.parse(linha.criado_em))) return null;
  let itens: ItemPedido[] = [];
  try {
    const bruto: unknown = JSON.parse(String(linha.itens_json ?? "[]"));
    if (!Array.isArray(bruto) || bruto.length > 40) return null;
    itens = bruto.filter((i): i is ItemPedido => Boolean(i && typeof i.nome === "string" && i.nome.trim() && Number.isInteger(i.quantidade) && i.quantidade > 0));
  } catch {
    return null;
  }
  const total = Number(linha.total_centavos);
  const status = (["nova", "atendimento", "concluida", "cancelada"] as const).find((s) => s === linha.status) ?? "nova";
  return { criadoEm: linha.criado_em, itens, totalCentavos: Number.isSafeInteger(total) && total > 0 ? total : null, status };
}

function somaOuNull(lista: readonly Pedido[]): number | null {
  const comValor = lista.filter((p) => p.totalCentavos !== null);
  return comValor.length ? comValor.reduce((s, p) => s + (p.totalCentavos ?? 0), 0) : null;
}

/** Produtos mais pedidos (por unidades), sem contar cestas canceladas. */
export function maisVendidos(pedidos: readonly Pedido[], limite = 10): ProdutoVendido[] {
  const por = new Map<string, ProdutoVendido>();
  for (const p of pedidos) {
    if (p.status === "cancelada") continue;
    const vistos = new Set<string>();
    for (const item of p.itens) {
      const chave = item.nome.trim().toLocaleLowerCase("pt-BR");
      const atual = por.get(chave) ?? { nome: item.nome.trim(), quantidade: 0, pedidos: 0 };
      atual.quantidade += item.quantidade;
      if (!vistos.has(chave)) atual.pedidos += 1;
      vistos.add(chave);
      por.set(chave, atual);
    }
  }
  return [...por.values()].sort((a, b) => b.quantidade - a.quantidade || b.pedidos - a.pedidos || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, limite);
}

export function resumirPeriodo(pedidos: readonly Pedido[], agoraMs: number, periodo: (typeof PERIODOS)[number]): ResumoPeriodo {
  const inicio = inicioPeriodo(agoraMs, periodo.dias);
  const doPeriodo = pedidos.filter((p) => {
    const t = Date.parse(p.criadoEm);
    return t >= inicio && t <= agoraMs + 60_000;
  });
  const validos = doPeriodo.filter((p) => p.status !== "cancelada");
  const concluidos = doPeriodo.filter((p) => p.status === "concluida");
  return {
    chave: periodo.chave,
    rotulo: periodo.rotulo,
    desde: diaBrasilia(inicio + 1),
    pedidos: doPeriodo.length,
    concluidos: concluidos.length,
    cancelados: doPeriodo.length - validos.length,
    emAberto: doPeriodo.filter((p) => p.status === "nova" || p.status === "atendimento").length,
    valorCestasCentavos: somaOuNull(validos),
    faturamentoCentavos: somaOuNull(concluidos),
    maisVendidos: maisVendidos(doPeriodo),
  };
}

export function resumirPedidos(pedidos: readonly Pedido[], agoraMs: number): ResumoPeriodo[] {
  return PERIODOS.map((p) => resumirPeriodo(pedidos, agoraMs, p));
}

// ---- Leitura do banco (D1). Recebe o banco por parâmetro para os testes usarem um falso. ----

export type PainelPedidos = {
  geradoEm: string;
  periodos: ResumoPeriodo[];
  /** Buscas sem resultado por período (null = tabela ainda sem registro nenhum). */
  buscas: Record<ChavePeriodo, LinhaBusca[]> | null;
};

const SQL_TABELA = "CREATE TABLE IF NOT EXISTS pre_venda (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, codigo TEXT NOT NULL, unidade TEXT NOT NULL, modo TEXT NOT NULL, itens_json TEXT NOT NULL, total_centavos INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'nova', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)";

/** Lê só as colunas do resumo (sem código do pedido, sem unidade): nada de cliente sai daqui. */
export async function lerPainelPedidos(db: Banco, agoraMs: number): Promise<PainelPedidos> {
  await db.exec(SQL_TABELA);
  const desde = new Date(inicioPeriodo(agoraMs, 30)).toISOString();
  const { results } = await db
    .prepare("SELECT criado_em, itens_json, total_centavos, status FROM pre_venda WHERE criado_em >= ? ORDER BY criado_em DESC LIMIT 5000")
    .bind(desde)
    .all<{ criado_em: string; itens_json: string; total_centavos: number; status: string }>();
  const pedidos = results.map(lerPedido).filter((p): p is Pedido => p !== null);
  const hoje = diaBrasilia(agoraMs);
  let buscas: PainelPedidos["buscas"] = null;
  try {
    const [b1, b7, b30] = await Promise.all(PERIODOS.map((p) => topBuscas(db, hoje, p.dias - 1, 15)));
    buscas = b30.length ? { hoje: b1, "7d": b7, "30d": b30 } : null;
  } catch {
    buscas = null;
  }
  return { geradoEm: new Date(agoraMs).toISOString(), periodos: resumirPedidos(pedidos, agoraMs), buscas };
}
