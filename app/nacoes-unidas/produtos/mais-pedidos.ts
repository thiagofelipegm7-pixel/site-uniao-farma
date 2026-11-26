/**
 * Vitrine "Mais pedidos" da home: ordena os produtos pelo que os clientes de fato fizeram no site, em vez de pela aparência.
 * Dois sinais reais, ambos anônimos e já guardados no banco:
 *  - pedidos enviados (pre_venda): quantos pedidos dos últimos 60 dias levaram o produto (peso maior);
 *  - cliques da busca (busca_clique): quantas vezes o produto foi aberto depois de uma busca (peso menor, limitado).
 * Só aparece produto com sinal real (nada é inventado). Com pouco histórico a lista é curta e a seção some se tiver menos de MIN_ITENS;
 * ela cresce sozinha conforme chegam pedidos. Módulo sem Cloudflare (testável): o banco entra pelo parâmetro.
 */
import type { Banco } from "../../nomes-corrigidos";

export const DIAS_JANELA = 60;
export const DIAS_JANELA_SEMANA = 7;
export const MIN_ITENS = 4;
const PESO_PEDIDO = 30;
const PESO_CLIQUE = 2;
const MAX_CLIQUES_CONTADOS = 15;

export type SinaisDeConversao = {
  /** Chave do nome do produto (sem acento, maiúsculas, sem a variante) → pedidos que o levaram. */
  pedidosPorNome: ReadonlyMap<string, number>;
  /** Slug → aberturas depois de uma busca. */
  cliquesPorSlug: ReadonlyMap<string, number>;
};

export const SINAIS_VAZIOS: SinaisDeConversao = { pedidosPorNome: new Map(), cliquesPorSlug: new Map() };

/** Mesmo formato do nome do catálogo: sem acento, espaços normalizados, maiúsculas, sem " — variante" do fim. */
export function chaveDoPedido(nome: string): string {
  return nome
    .split(" — ")[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Trava extra da vitrine "Mais pedidos": o catálogo nem sempre marca remédio como remédio (ex.: gotas de paracetamol infantil entram como
 * "Infantil e Gestante"). Se o nome lembra medicamento (dose em mg/mcg/UI, princípio ativo comum, forma farmacêutica ou antisséptico), fica de fora.
 */
export function pareceMedicamento(nome: string): boolean {
  const base = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/\d+(?:[.,]\d+)?\s?(?:mg|mcg|ug|ui|g\/100)(?![a-z0-9])|(?:mg|mcg)\s?\/\s?ml/.test(base)) return true;
  if (/paracetamol|dipirona|ibuprofeno|nimesulida|diclofenaco|cetoprofeno|clorexidina|periogard|omeprazol|loratadina|amoxicilina|azitromicina|predniso|dexameta|cetirizina|loperamida|simeticona|dramin|neosaldina|tylenol|novalgina|advil|polivitaminico|(?<![a-z0-9])aas(?![a-z0-9])|vitamina/.test(base)) return true;
  if (/(?<![a-z0-9])(?:gotas|xarope|comprimidos?|capsulas?|supositorio|colirio|solucao oral|suspensao oral|ampolas?|injetavel)(?![a-z0-9])/.test(base)) return true;
  return false;
}

export function pontosDeConversao(pedidos: number, cliques: number): number {
  const p = Number.isFinite(pedidos) && pedidos > 0 ? pedidos : 0;
  const c = Number.isFinite(cliques) && cliques > 0 ? Math.min(cliques, MAX_CLIQUES_CONTADOS) : 0;
  return p * PESO_PEDIDO + c * PESO_CLIQUE;
}

type Candidato = { nome: string; nomeOriginal: string; slug: string };

/**
 * Candidatos com sinal real, do maior para o menor (empate: o nome, para a ordem não mudar à toa).
 * `nomeOriginal` é o do catálogo; `nome` é o de exibição (os pedidos guardam o nome de exibição).
 */
export function ordenarPorConversao<T extends Candidato>(itens: readonly T[], sinais: SinaisDeConversao, n: number): T[] {
  const pontuados = itens
    .map((item) => {
      const pedidos = Math.max(sinais.pedidosPorNome.get(chaveDoPedido(item.nome)) ?? 0, sinais.pedidosPorNome.get(chaveDoPedido(item.nomeOriginal)) ?? 0);
      const cliques = sinais.cliquesPorSlug.get(item.slug) ?? 0;
      return { item, pontos: pontosDeConversao(pedidos, cliques) };
    })
    .filter((x) => x.pontos > 0);
  pontuados.sort((a, b) => b.pontos - a.pontos || a.item.nome.localeCompare(b.item.nome, "pt-BR"));
  return pontuados.slice(0, Math.max(0, n)).map((x) => x.item);
}

/** Lê os dois sinais do banco. Qualquer falha vira "sem sinal" (a vitrine some em vez de quebrar a home). */
export async function carregarSinais(db: Banco, hoje: string): Promise<SinaisDeConversao> {
  const pedidosPorNome = new Map<string, number>();
  const cliquesPorSlug = new Map<string, number>();
  try {
    const { results } = await db
      .prepare("SELECT json_extract(j.value, '$.nome') AS nome, COUNT(*) AS n FROM pre_venda p, json_each(p.itens_json) j WHERE p.criado_em >= date(?, ?) GROUP BY nome LIMIT 800")
      .bind(hoje, `-${DIAS_JANELA} day`)
      .all<{ nome: string | null; n: number }>();
    for (const linha of results) {
      if (typeof linha.nome !== "string" || !(linha.n > 0)) continue;
      const chave = chaveDoPedido(linha.nome);
      pedidosPorNome.set(chave, (pedidosPorNome.get(chave) ?? 0) + linha.n);
    }
  } catch {
    /* tabela ainda não existe ou banco fora do ar: sem pedidos */
  }
  try {
    const { results } = await db
      .prepare("SELECT slug, SUM(n) AS n FROM busca_clique WHERE dia >= date(?, ?) GROUP BY slug LIMIT 800")
      .bind(hoje, `-${DIAS_JANELA} day`)
      .all<{ slug: string; n: number }>();
    for (const linha of results) if (typeof linha.slug === "string" && linha.n > 0) cliquesPorSlug.set(linha.slug, linha.n);
  } catch {
    /* sem cliques */
  }
  return { pedidosPorNome, cliquesPorSlug };
}

/** Faixa da home: só entra o que não é medicamento (MIP, controlado, antimicrobiano ou nome com cara de remédio) e está em estoque. */
export function elegivelMaisPedidosSemana(item: { nome: string; nomeOriginal?: string; categoria?: string; isMIP?: boolean; esgotado?: boolean }): boolean {
  if (item.esgotado === true || item.isMIP === true) return false;
  if (item.categoria === "Medicamentos") return false;
  if (pareceMedicamento(item.nome)) return false;
  if (item.nomeOriginal && pareceMedicamento(item.nomeOriginal)) return false;
  return true;
}

/** Ordena só pelos pedidos reais (sem clique). Quem não teve pedido nos últimos 7 dias fica de fora. */
export function ordenarPorPedidosDaSemana<T extends Candidato>(itens: readonly T[], pedidosPorNome: ReadonlyMap<string, number>, n: number): T[] {
  const pontuados = itens
    .map((item) => {
      const pedidos = Math.max(pedidosPorNome.get(chaveDoPedido(item.nome)) ?? 0, pedidosPorNome.get(chaveDoPedido(item.nomeOriginal)) ?? 0);
      return { item, pedidos };
    })
    .filter((x) => x.pedidos > 0);
  pontuados.sort((a, b) => b.pedidos - a.pedidos || a.item.nome.localeCompare(b.item.nome, "pt-BR"));
  return pontuados.slice(0, Math.max(0, n)).map((x) => x.item);
}

/** A faixa some se não houver o mínimo de itens reais. */
export function faixaSeSuficiente<T>(itens: readonly T[], minimo = MIN_ITENS): T[] {
  return itens.length >= minimo ? [...itens] : [];
}

/** Pedidos enviados nos últimos 7 dias, só o nome do item (sem dado de cliente). Qualquer falha vira mapa vazio. */
export async function carregarPedidosDaSemana(db: Banco, hoje: string): Promise<ReadonlyMap<string, number>> {
  const pedidosPorNome = new Map<string, number>();
  try {
    const { results } = await db
      .prepare("SELECT json_extract(j.value, '$.nome') AS nome, COUNT(*) AS n FROM pre_venda p, json_each(p.itens_json) j WHERE p.criado_em >= date(?, ?) GROUP BY nome LIMIT 800")
      .bind(hoje, `-${DIAS_JANELA_SEMANA} day`)
      .all<{ nome: string | null; n: number }>();
    for (const linha of results) {
      if (typeof linha.nome !== "string" || !(linha.n > 0)) continue;
      const chave = chaveDoPedido(linha.nome);
      pedidosPorNome.set(chave, (pedidosPorNome.get(chave) ?? 0) + linha.n);
    }
  } catch {
    /* tabela ainda não existe ou banco fora do ar: a faixa some */
  }
  return pedidosPorNome;
}
