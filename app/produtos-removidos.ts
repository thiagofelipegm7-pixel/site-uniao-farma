/**
 * Produtos que a equipe tirou do site pelo painel interno ("Excluir produto"). O sistema da loja continua sendo a fonte: o item
 * segue no PC, só deixa de aparecer no site. A chave é o nome do sistema (mesma chave dos nomes e categorias corrigidos).
 * Histórico em produto_alteracao_log. A sincronização aplica produtos-removidos.json.
 */
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export { chaveDoNome };

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS produto_removido (chave TEXT PRIMARY KEY, original TEXT NOT NULL, por TEXT NOT NULL, quando TEXT NOT NULL)");
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_alteracao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, titulo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
}

async function log(db: Banco, chave: string, titulo: string, acao: string, por: string, agora: Date) {
  await db
    .prepare("INSERT INTO produto_alteracao_log (tipo, chave, titulo, acao, anterior, novo, por, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind("removido", chave, titulo, acao, null, null, por, agora.toISOString())
    .run();
}

/** Tira o produto do site. Repetir não faz mal. */
export async function removerProduto(db: Banco, original: string, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  await db.prepare("INSERT OR REPLACE INTO produto_removido (chave, original, por, quando) VALUES (?, ?, ?, ?)").bind(chave, original, por, agora.toISOString()).run();
  await log(db, chave, original, "excluiu o produto do site", por, agora);
}

/** Devolve o produto ao site (volta na próxima sincronização, se ainda estiver no PC). */
export async function restaurarProduto(db: Banco, original: string, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave FROM produto_removido WHERE chave = ?").bind(chave).first<{ chave: string }>();
  if (!antes) return;
  await db.prepare("DELETE FROM produto_removido WHERE chave = ?").bind(chave).run();
  await log(db, chave, original, "devolveu o produto ao site", por, agora);
}

export async function mapaDeRemovidos(db: Banco): Promise<Record<string, { original: string; por: string; quando: string }>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, por, quando FROM produto_removido ORDER BY quando").bind().all<{ chave: string; original: string; por: string; quando: string }>();
  const mapa: Record<string, { original: string; por: string; quando: string }> = {};
  for (const l of results) mapa[l.chave] = { original: l.original, por: l.por, quando: l.quando };
  return mapa;
}
