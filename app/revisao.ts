/**
 * Fila de revisão (camadas 1 e 2 de informações corretas). O que a sincronização segura aparece aqui; uma pessoa aprova ou
 * desfaz. Cada aprovação guarda quem, quando, o motivo e o valor anterior (histórico para desfazer). Módulo sem Cloudflare: testável.
 */
export const TIPOS_APROVACAO = ["variacao", "pmc", "enquadramento", "categoria"] as const;
export type TipoAprovacao = (typeof TIPOS_APROVACAO)[number];
export const CATEGORIAS_VALIDAS = ["Medicamentos", "Dermocosméticos", "Perfumes", "Infantil e Gestante", "Beleza", "Cuidado Diário", "Bem Estar"] as const;

/** Motivo da retenção -> tipo de aprovação que a libera. Preço zero e nome vazio não têm aprovação: o dado tem de ser corrigido na origem (DMaster). */
export const APROVACAO_DO_MOTIVO: Record<string, TipoAprovacao | null> = {
  variacao: "variacao",
  pmc: "pmc",
  enquadramento: "enquadramento",
  sem_categoria: "categoria",
  preco_zero: null,
  nome_vazio: null,
};

export type ItemDaFila = { chave: string; nome: string; lab: string; motivo: string; rotulo: string; detalhe: string; precoNovo: number | null; precoAtual: number | null; desde: string };
export type Aprovacao = { valor: string | number; por: string; quando: string; motivo: string };
export type MapaAprovacoes = Record<string, Partial<Record<TipoAprovacao, Aprovacao>>>;

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> } };
};

export type Pedido = { chave: string; tipo: TipoAprovacao; valor: string | number; por: string; motivo: string };

/** Confere o pedido de aprovação contra a fila: o valor do preço vem da própria fila (não do navegador). */
export function validarPedido(corpo: unknown, fila: readonly ItemDaFila[]): { ok: true; pedido: Pedido } | { ok: false; erro: string } {
  const c = (corpo ?? {}) as Record<string, unknown>;
  const chave = typeof c.chave === "string" ? c.chave : "";
  const motivoFila = typeof c.motivoFila === "string" ? c.motivoFila : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const motivo = typeof c.motivo === "string" ? c.motivo.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  if (por.length < 2 || por.length > 60) return { ok: false, erro: "quem_aprova" };
  const item = fila.find((i) => i.chave === chave && i.motivo === motivoFila);
  if (!item) return { ok: false, erro: "fora_da_fila" };
  const tipo = APROVACAO_DO_MOTIVO[item.motivo];
  if (!tipo) return { ok: false, erro: "corrigir_na_origem" };
  let valor: string | number;
  if (tipo === "variacao" || tipo === "pmc") {
    if (item.precoNovo === null) return { ok: false, erro: "sem_preco" };
    valor = item.precoNovo;
  } else if (tipo === "categoria") {
    const v = typeof c.valor === "string" ? c.valor : "";
    if (!(CATEGORIAS_VALIDAS as readonly string[]).includes(v)) return { ok: false, erro: "categoria_invalida" };
    valor = v;
  } else {
    valor = "consulte";
  }
  if (tipo === "pmc" && motivo.length < 5) return { ok: false, erro: "explique_o_motivo" }; // vender acima do teto exige justificativa escrita
  return { ok: true, pedido: { chave, tipo, valor, por, motivo } };
}

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS catalogo_aprovacao (chave TEXT NOT NULL, tipo TEXT NOT NULL, valor TEXT NOT NULL, por TEXT NOT NULL, motivo TEXT NOT NULL, quando TEXT NOT NULL, PRIMARY KEY (chave, tipo))");
  await db.exec("CREATE TABLE IF NOT EXISTS catalogo_aprovacao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL, tipo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)");
}

type Linha = { chave: string; tipo: TipoAprovacao; valor: string; por: string; motivo: string; quando: string };
const conv = (l: Linha): string | number => (l.tipo === "variacao" || l.tipo === "pmc" ? Number(l.valor) : l.valor);

export async function aprovar(db: Banco, p: Pedido, agora = new Date()): Promise<void> {
  await garantir(db);
  const quando = agora.toISOString();
  const antes = await db.prepare("SELECT chave, tipo, valor, por, motivo, quando FROM catalogo_aprovacao WHERE chave = ? AND tipo = ?").bind(p.chave, p.tipo).first<Linha>();
  await db.prepare("INSERT OR REPLACE INTO catalogo_aprovacao (chave, tipo, valor, por, motivo, quando) VALUES (?, ?, ?, ?, ?, ?)").bind(p.chave, p.tipo, String(p.valor), p.por, p.motivo, quando).run();
  await db.prepare("INSERT INTO catalogo_aprovacao_log (chave, tipo, acao, anterior, novo, por, quando) VALUES (?, ?, 'aprovar', ?, ?, ?, ?)").bind(p.chave, p.tipo, antes ? JSON.stringify(antes) : null, JSON.stringify({ valor: p.valor, motivo: p.motivo }), p.por, quando).run();
}

export async function desfazer(db: Banco, chave: string, tipo: TipoAprovacao, por: string, agora = new Date()): Promise<boolean> {
  await garantir(db);
  const antes = await db.prepare("SELECT chave, tipo, valor, por, motivo, quando FROM catalogo_aprovacao WHERE chave = ? AND tipo = ?").bind(chave, tipo).first<Linha>();
  if (!antes) return false;
  const quando = agora.toISOString();
  await db.prepare("DELETE FROM catalogo_aprovacao WHERE chave = ? AND tipo = ?").bind(chave, tipo).run();
  await db.prepare("INSERT INTO catalogo_aprovacao_log (chave, tipo, acao, anterior, novo, por, quando) VALUES (?, ?, 'desfazer', ?, NULL, ?, ?)").bind(chave, tipo, JSON.stringify(antes), por, quando).run();
  return true;
}

export async function mapaDeAprovacoes(db: Banco): Promise<MapaAprovacoes> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, tipo, valor, por, motivo, quando FROM catalogo_aprovacao ORDER BY quando").bind().all<Linha>();
  const mapa: MapaAprovacoes = {};
  for (const l of results) (mapa[l.chave] ??= {})[l.tipo] = { valor: conv(l), por: l.por, quando: l.quando, motivo: l.motivo };
  return mapa;
}

export async function historico(db: Banco, limite = 30): Promise<{ chave: string; tipo: string; acao: string; por: string; quando: string; anterior: string | null; novo: string | null }[]> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, tipo, acao, por, quando, anterior, novo FROM catalogo_aprovacao_log ORDER BY id DESC LIMIT ?").bind(limite).all<{ chave: string; tipo: string; acao: string; por: string; quando: string; anterior: string | null; novo: string | null }>();
  return results;
}
