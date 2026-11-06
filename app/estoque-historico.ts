/**
 * Histórico diário do estoque no D1 (banco privado do site). Uma linha por dia com a lista dos itens que tinham estoque
 * (quem não está na lista tinha 0). O painel é a única leitura; nada disto vai para os arquivos públicos do site.
 */
import type { ItemEstoque, PontoHistorico } from "./estoque-alertas";

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    bind(...valores: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }> };
  };
};

export const DIAS_GUARDADOS = 35;
const NAO_PRODUTO = /TAXA DE ENTREGA|APLICACAO|AFERIMENTO|XEROX|MANIPULACAO/i;

/** Dia de Brasília (AAAA-MM-DD) de um instante. */
export function diaBrasilia(agora = new Date()): string {
  return new Date(agora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Converte o export do DMaster nos itens do painel (descarta o que não é produto e o que tem dados ruins). */
export function itensDoExport(dados: unknown): ItemEstoque[] {
  const lista = (dados as { itens?: unknown })?.itens;
  if (!Array.isArray(lista)) return [];
  const saida: ItemEstoque[] = [];
  for (const bruto of lista) {
    const it = bruto as Record<string, unknown>;
    const nome = typeof it.Produto === "string" ? it.Produto.replace(/\s+/g, " ").trim() : "";
    const chave = String(it.CodigoDeBarras ?? nome).trim();
    const estoque = typeof it.Estoque === "number" && Number.isFinite(it.Estoque) ? Math.floor(it.Estoque) : null;
    if (!nome || !chave || estoque === null || NAO_PRODUTO.test(nome)) continue;
    saida.push({ chave, nome, lab: typeof it.Laboratorio === "string" ? it.Laboratorio.trim() : "", estoque, preco: typeof it.Pvenda === "number" && it.Pvenda > 0 ? it.Pvenda : 0 });
  }
  return saida;
}

async function garantirTabela(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS estoque_dia (dia TEXT PRIMARY KEY, dados TEXT NOT NULL)");
}

/** Guarda (ou substitui) o estoque do dia: só itens com estoque > 0, no formato [[chave, estoque, nome], ...]. */
export async function salvarSnapshot(db: Banco, dia: string, itens: readonly ItemEstoque[]): Promise<number> {
  await garantirTabela(db);
  const linhas = itens.filter((i) => i.estoque > 0).map((i) => [i.chave, i.estoque, i.nome]);
  await db.prepare("INSERT OR REPLACE INTO estoque_dia (dia, dados) VALUES (?, ?)").bind(dia, JSON.stringify(linhas)).run();
  const limite = new Date(Date.parse(`${dia}T12:00:00Z`) - DIAS_GUARDADOS * 86_400_000).toISOString().slice(0, 10);
  await db.prepare("DELETE FROM estoque_dia WHERE dia < ?").bind(limite).run();
  return linhas.length;
}

/** Histórico por item (sem o dia `ate`, que é o dia de hoje e vem do export). Dias sem registro simplesmente não entram. */
export async function lerHistorico(db: Banco, ate: string, dias = 28): Promise<{ porItem: Map<string, PontoHistorico[]>; diasRegistrados: number }> {
  await garantirTabela(db);
  const desde = new Date(Date.parse(`${ate}T12:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10);
  const { results } = await db.prepare("SELECT dia, dados FROM estoque_dia WHERE dia >= ? AND dia < ? ORDER BY dia").bind(desde, ate).all<{ dia: string; dados: string }>();
  const porItem = new Map<string, PontoHistorico[]>();
  const vistoPorDia = new Map<string, Set<string>>();
  for (const linha of results) {
    let lista: Array<[string, number, string]> = [];
    try {
      lista = JSON.parse(linha.dados);
    } catch {
      continue;
    }
    const vistos = new Set<string>();
    for (const [chave, estoque, nome] of lista) {
      vistos.add(chave);
      const pontos = porItem.get(chave) ?? [];
      pontos.push({ dia: linha.dia, estoque, nome });
      porItem.set(chave, pontos);
    }
    vistoPorDia.set(linha.dia, vistos);
  }
  // Item que tinha estoque num dia e não aparece em outro dia registrado ficou com 0 naquele dia.
  for (const [chave, pontos] of porItem) {
    const tem = new Set(pontos.map((p) => p.dia));
    for (const dia of vistoPorDia.keys()) if (!tem.has(dia)) pontos.push({ dia, estoque: 0 });
    pontos.sort((a, b) => a.dia.localeCompare(b.dia));
    porItem.set(chave, pontos);
  }
  return { porItem, diasRegistrados: results.length };
}
