/**
 * Fila de sugestões da IA para a equipe revisar (descrição e marca em lote). A IA só propõe: nada daqui chega ao cliente.
 * Aprovar = a equipe salva pelo fluxo normal do painel (com histórico). Descartar guarda o estado para a IA não repetir o produto.
 * Módulo sem Cloudflare (testável).
 */
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export type SugestaoFila = { chave: string; original: string; descricao: string; marca: string; fontes: string; estado: "pendente" | "descartada" | "aprovada" | "sem_sugestao"; criado: string };

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS ia_sugestao_fila (chave TEXT PRIMARY KEY, original TEXT NOT NULL, descricao TEXT NOT NULL, marca TEXT NOT NULL, estado TEXT NOT NULL, criado TEXT NOT NULL)");
  // Sites consultados na pesquisa (para a equipe conferir). Coluna nova: tabelas antigas ganham a coluna uma vez.
  await db.exec("ALTER TABLE ia_sugestao_fila ADD COLUMN fontes TEXT NOT NULL DEFAULT ''").catch(() => undefined);
}

export async function guardarSugestao(db: Banco, original: string, descricao: string, marca: string, estado: SugestaoFila["estado"], fontes = "", agora = new Date()): Promise<void> {
  await garantir(db);
  await db
    .prepare("INSERT OR REPLACE INTO ia_sugestao_fila (chave, original, descricao, marca, estado, criado, fontes) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(chaveDoNome(original), original, descricao, marca, estado, agora.toISOString(), fontes)
    .run();
}

export async function pendentes(db: Banco): Promise<SugestaoFila[]> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, descricao, marca, fontes, estado, criado FROM ia_sugestao_fila WHERE estado = ? ORDER BY criado").bind("pendente").all<SugestaoFila>();
  return results;
}

/** Chaves que a IA já tratou (em qualquer estado): não entram em um novo lote. */
export async function chavesJaTratadas(db: Banco): Promise<Set<string>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave FROM ia_sugestao_fila").bind().all<{ chave: string }>();
  return new Set(results.map((r) => r.chave));
}

export async function decidir(db: Banco, original: string, estado: "descartada" | "aprovada"): Promise<void> {
  await garantir(db);
  await db.prepare("UPDATE ia_sugestao_fila SET estado = ? WHERE chave = ?").bind(estado, chaveDoNome(original)).run();
}

/** Produtos para refazer: sugestões pendentes (de uma versão anterior do pedido) e os que ficaram sem sugestão. Voltam a valer só depois do novo resultado. */
export async function paraRefazer(db: Banco): Promise<string[]> {
  await garantir(db);
  const { results } = await db.prepare("SELECT original FROM ia_sugestao_fila WHERE estado = ? OR estado = ? ORDER BY criado").bind("pendente", "sem_sugestao").all<{ original: string }>();
  return results.map((r) => r.original);
}
