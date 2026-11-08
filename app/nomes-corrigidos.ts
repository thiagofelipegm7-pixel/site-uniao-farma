/**
 * Correção de nome de produto pelo painel interno, com histórico. O nome do sistema da loja (DMaster) continua sendo a chave
 * (foto, página e aprovações dependem dele); o que muda é só o nome que o cliente lê. Cada mudança guarda quem, quando e o
 * valor anterior, e pode ser desfeita. Módulo sem Cloudflare (testável).
 */
export type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> } };
};

export function chaveDoNome(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Nome novo: 3 a 120 caracteres, sem marcação HTML, sem o nome todo em maiúsculas (o ponto é falar como o cliente fala). */
export function validarNome(texto: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = typeof texto === "string" ? texto.replace(/\s+/g, " ").trim() : "";
  if (nome.length < 3 || nome.length > 120) return { ok: false, erro: "tamanho" };
  if (/[<>]/.test(nome)) return { ok: false, erro: "caracteres" };
  if (nome.length > 6 && nome === nome.toUpperCase() && /[A-ZÀ-Ú]{4}/.test(nome)) return { ok: false, erro: "tudo_maiusculo" };
  return { ok: true, nome };
}

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS produto_nome (chave TEXT PRIMARY KEY, original TEXT NOT NULL, nome TEXT NOT NULL, por TEXT NOT NULL, quando TEXT NOT NULL)");
  await db.exec("CREATE TABLE IF NOT EXISTS produto_alteracao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, titulo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)");
}

type LinhaNome = { chave: string; original: string; nome: string; por: string; quando: string };

export async function registrar(db: Banco, a: { tipo: "nome" | "foto"; chave: string; titulo: string; acao: string; anterior?: string | null; novo?: string | null; por: string }, agora = new Date()) {
  await garantir(db);
  await db.prepare("INSERT INTO produto_alteracao_log (tipo, chave, titulo, acao, anterior, novo, por, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(a.tipo, a.chave, a.titulo, a.acao, a.anterior ?? null, a.novo ?? null, a.por, agora.toISOString()).run();
}

export async function corrigirNome(db: Banco, original: string, nome: string, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave, original, nome, por, quando FROM produto_nome WHERE chave = ?").bind(chave).first<LinhaNome>();
  await db.prepare("INSERT OR REPLACE INTO produto_nome (chave, original, nome, por, quando) VALUES (?, ?, ?, ?, ?)").bind(chave, original, nome, por, agora.toISOString()).run();
  await registrar(db, { tipo: "nome", chave, titulo: original, acao: "corrigiu o nome", anterior: antes?.nome ?? null, novo: nome, por }, agora);
}

export async function desfazerNome(db: Banco, original: string, por: string, agora = new Date()): Promise<boolean> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave, original, nome, por, quando FROM produto_nome WHERE chave = ?").bind(chave).first<LinhaNome>();
  if (!antes) return false;
  await db.prepare("DELETE FROM produto_nome WHERE chave = ?").bind(chave).run();
  await registrar(db, { tipo: "nome", chave, titulo: original, acao: "desfez a correção do nome", anterior: antes.nome, novo: null, por }, agora);
  return true;
}

/** chave (nome do sistema) -> nome corrigido. */
export async function mapaDeNomes(db: Banco): Promise<Record<string, { nome: string; por: string; quando: string }>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, nome, por, quando FROM produto_nome ORDER BY quando").bind().all<LinhaNome>();
  const mapa: Record<string, { nome: string; por: string; quando: string }> = {};
  for (const l of results) mapa[l.chave] = { nome: l.nome, por: l.por, quando: l.quando };
  return mapa;
}

export type Alteracao = { tipo: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string; quando: string };

export async function ultimasAlteracoes(db: Banco, limite = 20): Promise<Alteracao[]> {
  await garantir(db);
  const { results } = await db.prepare("SELECT tipo, titulo, acao, anterior, novo, por, quando FROM produto_alteracao_log ORDER BY id DESC LIMIT ?").bind(limite).all<Alteracao>();
  return results;
}
