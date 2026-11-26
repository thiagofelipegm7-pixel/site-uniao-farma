/**
 * Edição de itens de um pedido do site pela equipe (/interno/vendas, cartões de pré-venda).
 * Caso típico: o cliente fechou a cesta no site e, no WhatsApp, pediu para tirar um produto ou mudar a quantidade.
 *
 * Regras:
 * - Preço nunca vem do navegador. Item que já estava no pedido mantém o preço que o cliente viu; item novo usa o preço do
 *   catálogo do site no momento da edição. O total é sempre recalculado aqui.
 * - O pedido não pode ficar sem itens: para desistir de tudo, a equipe muda o andamento para "Não fechou".
 * - Edição bloqueada quando o pedido está concluído ou cancelado, ou quando o entregador já retirou o pedido na loja.
 *   Com cotação ou entregador chamado (antes da coleta), a edição é permitida com aviso de que o valor muda.
 * - A mensagem de WhatsApp com o resumo novo só é montada; quem envia é a equipe (wa.me). Nada é enviado sozinho.
 * Módulo sem Cloudflare (testável).
 */
import type { Banco } from "./nomes-corrigidos";
import { normalizarTelefone } from "./reserva/lembrete-recompra";
import { unidadeDaRetirada } from "./retirada";

export type ItemPedido = { nome: string; quantidade: number; precoCentavos: number };
export type StatusPedido = "nova" | "atendimento" | "concluida" | "cancelada";
export type ItemCatalogoPedido = { slug: string; nome: string; precoCentavos: number };
/** O que o navegador manda: item existente pela posição no pedido salvo, ou item novo pelo slug do catálogo. Sem preço. */
export type EntradaItem = { indice: number; quantidade: number } | { slug: string; quantidade: number };
export type Edicao = { em: string; por: string; antesCentavos: number; depoisCentavos: number; mudancas: string[] };
export type EntregaLigada = { status: string; temPedido: boolean };

export const QTD_MIN = 1;
export const QTD_MAX = 20;
export const ITENS_MAX = 40;
export const TOTAL_MAX = 500_000_000;
export const HISTORICO_MAX = 20;

/** Entrega que já saiu da loja (ou terminou): não dá mais para mexer nos itens. */
export const ENTREGA_SAIU = new Set(["PICKED_UP", "COMPLETED", "pickup_complete", "dropoff", "delivered", "returned"]);
/** Entregador chamado, mas ainda não coletou: pode editar, com aviso. */
export const ENTREGA_A_CAMINHO = new Set(["ASSIGNING_DRIVER", "ON_GOING", "pending", "pickup"]);
/** Entrega que não aconteceu: não conta. */
export const ENTREGA_DESCARTADA = new Set(["CANCELED", "REJECTED", "EXPIRED", "canceled"]);

/** Colunas novas da pre_venda (aditivas). Linhas antigas ficam sem edição. */
const COLUNAS: ReadonlyArray<readonly [string, string]> = [
  ["editado_em", "TEXT"],
  ["editado_por", "TEXT"],
  ["edicoes_json", "TEXT"],
];
let colunasProntas = false;

export async function garantirColunasEdicao(db: Banco) {
  if (colunasProntas) return;
  const { results } = await db.prepare("PRAGMA table_info(pre_venda)").bind().all<{ name: string }>();
  const existentes = new Set(results.map((c) => c.name));
  for (const [coluna, tipo] of COLUNAS) {
    if (existentes.has(coluna)) continue;
    try {
      await db.exec(`ALTER TABLE pre_venda ADD COLUMN ${coluna} ${tipo}`);
    } catch (e) {
      if (!/duplicate column/i.test(String(e))) throw e;
    }
  }
  colunasProntas = true;
}

/** Só para os testes. */
export function esquecerColunasEdicao() {
  colunasProntas = false;
}

export const totalDosItens = (itens: readonly ItemPedido[]) => itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0);

export function lerItens(json: unknown): ItemPedido[] {
  try {
    const p: unknown = JSON.parse(String(json ?? "[]"));
    if (!Array.isArray(p)) return [];
    return p.filter((i): i is ItemPedido => Boolean(i && typeof i.nome === "string" && Number.isInteger(i.quantidade) && Number.isInteger(i.precoCentavos)));
  } catch {
    return [];
  }
}

export function lerHistorico(json: unknown): Edicao[] {
  if (typeof json !== "string" || !json) return [];
  try {
    const p: unknown = JSON.parse(json);
    if (!Array.isArray(p)) return [];
    return p.filter((e): e is Edicao => Boolean(e && typeof e.em === "string" && typeof e.por === "string" && Array.isArray(e.mudancas))).slice(-HISTORICO_MAX);
  } catch {
    return [];
  }
}

/** Nome de quem alterou: o login da equipe é um só, então a pessoa se identifica. 2 a 40 caracteres, sem marcação. */
export function validarAutor(bruto: unknown): string | null {
  const nome = typeof bruto === "string" ? bruto.replace(/[<>]/g, "").replace(/\s+/g, " ").trim() : "";
  return nome.length >= 2 && nome.length <= 40 ? nome : null;
}

/**
 * Regra de bloqueio. Retorna o motivo (texto para a equipe) ou null se pode editar.
 * - "concluida"/"cancelada": bloqueado.
 * - Entrega ligada que já saiu da loja (ou com status desconhecido depois de pedida): bloqueado.
 */
export function motivoBloqueio(status: string, entregas: readonly EntregaLigada[]): string | null {
  if (status === "concluida") return "Venda concluída: os itens não podem mais ser alterados.";
  if (status === "cancelada") return "Pedido marcado como \"Não fechou\": volte o andamento para \"Em atendimento\" se o cliente retomou.";
  for (const e of entregas) {
    if (!e.temPedido || ENTREGA_DESCARTADA.has(e.status) || ENTREGA_A_CAMINHO.has(e.status)) continue;
    if (ENTREGA_SAIU.has(e.status)) return "O pedido já saiu para entrega: os itens não podem mais ser alterados.";
    return "Há uma entrega pedida com andamento desconhecido: confira em Entregas antes de alterar.";
  }
  return null;
}

/** Aviso (sem bloquear) quando há cotação ou entregador chamado: o valor do pedido muda. */
export function avisoEntrega(entregas: readonly EntregaLigada[]): string | null {
  const ativas = entregas.filter((e) => !ENTREGA_DESCARTADA.has(e.status));
  if (ativas.some((e) => e.temPedido && ENTREGA_A_CAMINHO.has(e.status))) {
    return "Já tem entregador chamado para este pedido. O valor dos produtos muda: avise o entregador e confira o valor a cobrar.";
  }
  if (ativas.some((e) => !e.temPedido)) return "Este pedido já tem cotação de entrega. O valor dos produtos muda: confira o valor a cobrar antes de chamar o entregador.";
  return null;
}

const dinheiro = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type ResultadoEdicao =
  | { ok: true; itens: ItemPedido[]; totalCentavos: number; mudancas: string[] }
  | { ok: false; erro: "item_invalido" | "sem_itens" | "muitos_itens" | "nao_encontrado_catalogo" | "total_invalido" | "sem_mudanca"; detalhe?: string };

/**
 * Monta a lista nova a partir da salva e do que a equipe mandou. Preço nunca vem da entrada.
 * `catalogo(slug)` devolve o item do catálogo do site (nome e preço do dia) ou null.
 */
export function aplicarEdicao(atuais: readonly ItemPedido[], entrada: unknown, catalogo: (slug: string) => ItemCatalogoPedido | null): ResultadoEdicao {
  if (!Array.isArray(entrada)) return { ok: false, erro: "item_invalido" };
  if (entrada.length === 0) return { ok: false, erro: "sem_itens" };
  if (entrada.length > ITENS_MAX) return { ok: false, erro: "muitos_itens" };
  const novos: ItemPedido[] = [];
  const usados = new Set<number>();
  const qtdValida = (q: unknown): q is number => Number.isInteger(q) && Number(q) >= QTD_MIN && Number(q) <= QTD_MAX;
  for (const bruto of entrada as Array<Record<string, unknown>>) {
    if (!bruto || typeof bruto !== "object" || !qtdValida(bruto.quantidade)) return { ok: false, erro: "item_invalido" };
    const quantidade = Number(bruto.quantidade);
    if ("indice" in bruto) {
      const i = bruto.indice;
      if (!Number.isInteger(i) || Number(i) < 0 || Number(i) >= atuais.length || usados.has(Number(i))) return { ok: false, erro: "item_invalido" };
      usados.add(Number(i));
      const atual = atuais[Number(i)];
      novos.push({ nome: atual.nome, quantidade, precoCentavos: atual.precoCentavos });
    } else if (typeof bruto.slug === "string" && /^[a-z0-9-]{1,200}$/.test(bruto.slug)) {
      const achado = catalogo(bruto.slug);
      if (!achado || !Number.isInteger(achado.precoCentavos) || achado.precoCentavos < 1) return { ok: false, erro: "nao_encontrado_catalogo", detalhe: bruto.slug };
      const mesmo = novos.find((n) => n.nome === achado.nome);
      if (mesmo) mesmo.quantidade = Math.min(QTD_MAX, mesmo.quantidade + quantidade);
      else novos.push({ nome: achado.nome, quantidade, precoCentavos: achado.precoCentavos });
    } else {
      return { ok: false, erro: "item_invalido" };
    }
  }
  if (novos.length === 0) return { ok: false, erro: "sem_itens" };
  const totalCentavos = totalDosItens(novos);
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos > TOTAL_MAX) return { ok: false, erro: "total_invalido" };

  const mudancas: string[] = [];
  atuais.forEach((a, i) => {
    if (!usados.has(i)) mudancas.push(`Removido: ${a.nome}`);
  });
  for (const n of novos) {
    const antes = atuais.find((a) => a.nome === n.nome);
    if (!antes) mudancas.push(`Incluído: ${n.quantidade}× ${n.nome}`);
    else if (antes.quantidade !== n.quantidade) mudancas.push(`Quantidade: ${n.nome} de ${antes.quantidade} para ${n.quantidade}`);
  }
  if (mudancas.length === 0) return { ok: false, erro: "sem_mudanca" };
  return { ok: true, itens: novos, totalCentavos, mudancas };
}

/** Busca simples no catálogo para incluir item: todas as palavras precisam aparecer. Até 12 resultados. */
export function buscarNoCatalogo<T extends { busca: string }>(itens: readonly T[], termo: string, normalizar: (s: string) => string, limite = 12): T[] {
  const palavras = normalizar(termo).split(" ").filter((p) => p.length > 0);
  if (!palavras.length || normalizar(termo).length < 2) return [];
  const achados: T[] = [];
  for (const item of itens) {
    if (palavras.every((p) => item.busca.includes(p))) {
      achados.push(item);
      if (achados.length >= limite) break;
    }
  }
  return achados;
}

/**
 * Mensagem com o resumo novo para a equipe mandar no WhatsApp. Só nomes, quantidades e valores do pedido:
 * sem destaque para medicamento, sem preço riscado, sem promessa de saúde.
 */
export function mensagemPedidoAtualizado(p: { codigo: string; unidade: string; modo: string; itens: readonly ItemPedido[]; totalCentavos: number }): string {
  const loja = unidadeDaRetirada(p.unidade);
  return [
    `Olá! Aqui é da União Farma ${loja.shortName}.`,
    `Atualizamos o seu pedido ${p.codigo} como combinado. Ficou assim:`,
    ...p.itens.map((i) => `${i.quantidade}× ${i.nome}: ${dinheiro(i.precoCentavos * i.quantidade)}`),
    `Total dos produtos (estimativa): ${dinheiro(p.totalCentavos)}`,
    p.modo === "casa" ? "A taxa de entrega continua a mesma combinada antes." : "O pagamento é feito na loja, na hora da retirada.",
    "Se estiver tudo certo, é só responder esta mensagem.",
  ].join("\n");
}

/** Com o WhatsApp que o cliente deixou (só na retirada), abre a conversa dele; sem número, a equipe escolhe a conversa. */
export function linkPedidoAtualizado(telefoneBruto: string | null, mensagem: string): string {
  const tel = telefoneBruto ? normalizarTelefone(telefoneBruto) : null;
  return `https://wa.me/${tel ?? ""}?text=${encodeURIComponent(mensagem)}`;
}

/** Entregas ligadas às pré-vendas (tabela pode não existir ainda). */
export async function lerEntregasLigadas(db: Banco, ids: readonly string[]): Promise<Map<string, EntregaLigada[]>> {
  const mapa = new Map<string, EntregaLigada[]>();
  if (!ids.length) return mapa;
  try {
    for (let i = 0; i < ids.length; i += 90) {
      const lote = ids.slice(i, i + 90);
      const { results } = await db
        .prepare(`SELECT pre_venda_id, status, order_id FROM entrega_lalamove WHERE pre_venda_id IN (${lote.map(() => "?").join(", ")})`)
        .bind(...lote)
        .all<{ pre_venda_id: string; status: string; order_id: string | null }>();
      for (const l of results) {
        const lista = mapa.get(l.pre_venda_id) ?? [];
        lista.push({ status: String(l.status ?? ""), temPedido: Boolean(l.order_id) });
        mapa.set(l.pre_venda_id, lista);
      }
    }
  } catch {
    // Sem a tabela de entregas: nenhum entregador foi chamado.
  }
  return mapa;
}
