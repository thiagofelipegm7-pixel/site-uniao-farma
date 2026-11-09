/**
 * Override de categoria do produto pelo painel interno.
 * "auto" = classificação do sistema; demais = uma das categorias públicas da loja.
 * Histórico em produto_alteracao_log. A sincronização aplica categorias-overrides.json.
 */
import { CATEGORIAS_VALIDAS } from "./revisao";
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export type EstadoCategoria = "auto" | (typeof CATEGORIAS_VALIDAS)[number];

export { chaveDoNome, CATEGORIAS_VALIDAS };

export function validarCategoria(v: unknown): { ok: true; estado: EstadoCategoria } | { ok: false; erro: string } {
  if (v === "auto") return { ok: true, estado: "auto" };
  if (typeof v === "string" && (CATEGORIAS_VALIDAS as readonly string[]).includes(v)) {
    return { ok: true, estado: v as (typeof CATEGORIAS_VALIDAS)[number] };
  }
  return { ok: false, erro: "categoria_invalida" };
}

async function garantir(db: Banco) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_categoria (chave TEXT PRIMARY KEY, original TEXT NOT NULL, categoria TEXT NOT NULL, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_alteracao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, titulo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
}

type Linha = { chave: string; original: string; categoria: string; por: string; quando: string };

async function log(db: Banco, a: { chave: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string }, agora: Date) {
  await db
    .prepare("INSERT INTO produto_alteracao_log (tipo, chave, titulo, acao, anterior, novo, por, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind("categoria", a.chave, a.titulo, a.acao, a.anterior, a.novo, a.por, agora.toISOString())
    .run();
}

export async function definirCategoria(db: Banco, original: string, estado: EstadoCategoria, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave, original, categoria, por, quando FROM produto_categoria WHERE chave = ?").bind(chave).first<Linha>();
  if (estado === "auto") {
    if (!antes) return;
    await db.prepare("DELETE FROM produto_categoria WHERE chave = ?").bind(chave).run();
    await log(db, { chave, titulo: original, acao: "voltou a categoria ao automático", anterior: antes.categoria, novo: "auto", por }, agora);
    return;
  }
  await db
    .prepare("INSERT OR REPLACE INTO produto_categoria (chave, original, categoria, por, quando) VALUES (?, ?, ?, ?, ?)")
    .bind(chave, original, estado, por, agora.toISOString())
    .run();
  await log(db, {
    chave,
    titulo: original,
    acao: "alterou a categoria",
    anterior: antes?.categoria ?? "auto",
    novo: estado,
    por,
  }, agora);
}

export async function mapaDeCategorias(db: Banco): Promise<Record<string, { categoria: string; por: string; quando: string }>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, categoria, por, quando FROM produto_categoria ORDER BY quando").bind().all<Linha>();
  const mapa: Record<string, { categoria: string; por: string; quando: string }> = {};
  for (const l of results) mapa[l.chave] = { categoria: l.categoria, por: l.por, quando: l.quando };
  return mapa;
}
