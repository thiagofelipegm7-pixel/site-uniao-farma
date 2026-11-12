/**
 * Marca/laboratório do produto preenchida no painel interno (para quem o sistema da loja traz sem laboratório, ou com o errado).
 * Vazio = volta ao automático. Histórico em produto_alteracao_log. A sincronização escreve marcas-corrigidas.json.
 */
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export { chaveDoNome };

/** Marca nova: 2 a 60 caracteres, sem marcação HTML. Vazio/null = automático. */
export function validarMarca(v: unknown): { ok: true; marca: string | null } | { ok: false; erro: string } {
  if (v === null || v === undefined) return { ok: true, marca: null };
  if (typeof v !== "string") return { ok: false, erro: "marca_invalida" };
  const marca = v.replace(/\s+/g, " ").trim();
  if (!marca) return { ok: true, marca: null };
  if (marca.length < 2 || marca.length > 60 || /[<>]/.test(marca)) return { ok: false, erro: "marca_invalida" };
  return { ok: true, marca };
}

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS produto_marca (chave TEXT PRIMARY KEY, original TEXT NOT NULL, marca TEXT NOT NULL, por TEXT NOT NULL, quando TEXT NOT NULL)");
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_alteracao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, titulo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
}

type Linha = { chave: string; original: string; marca: string; por: string; quando: string };

async function log(db: Banco, a: { chave: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string }, agora: Date) {
  await db
    .prepare("INSERT INTO produto_alteracao_log (tipo, chave, titulo, acao, anterior, novo, por, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind("marca", a.chave, a.titulo, a.acao, a.anterior, a.novo, a.por, agora.toISOString())
    .run();
}

export async function definirMarca(db: Banco, original: string, marca: string | null, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave, original, marca, por, quando FROM produto_marca WHERE chave = ?").bind(chave).first<Linha>();
  if (marca === null) {
    if (!antes) return;
    await db.prepare("DELETE FROM produto_marca WHERE chave = ?").bind(chave).run();
    await log(db, { chave, titulo: original, acao: "voltou a marca ao automático", anterior: antes.marca, novo: null, por }, agora);
    return;
  }
  await db.prepare("INSERT OR REPLACE INTO produto_marca (chave, original, marca, por, quando) VALUES (?, ?, ?, ?, ?)").bind(chave, original, marca, por, agora.toISOString()).run();
  await log(db, { chave, titulo: original, acao: "preencheu a marca", anterior: antes?.marca ?? null, novo: marca, por }, agora);
}

export async function mapaDeMarcas(db: Banco): Promise<Record<string, { marca: string; por: string; quando: string }>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, marca, por, quando FROM produto_marca ORDER BY quando").bind().all<Linha>();
  const mapa: Record<string, { marca: string; por: string; quando: string }> = {};
  for (const l of results) mapa[l.chave] = { marca: l.marca, por: l.por, quando: l.quando };
  return mapa;
}
