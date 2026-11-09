/**
 * Override de enquadramento "Controlado (Portaria 344)" pelo painel interno.
 * Três estados: automático (sem linha), marcar controlado, marcar não controlado.
 * A sincronização aplica o mapa no catálogo (listas receita/controlados). Histórico em produto_alteracao_log.
 */
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export type EstadoControlado = "auto" | "sim" | "nao";
export const ESTADOS_CONTROLADO = ["auto", "sim", "nao"] as const;

/** Só Medicamentos mostram o seletor no painel; override sim/não só é aceito nessa categoria. */
export const CATEGORIA_COM_CONTROLADO = "Medicamentos";

export function ehCategoriaComControlado(categoria: string | null | undefined): boolean {
  return (categoria ?? "").trim() === CATEGORIA_COM_CONTROLADO;
}

export { chaveDoNome };

export function validarEstado(v: unknown): { ok: true; estado: EstadoControlado } | { ok: false; erro: string } {
  if (v === "auto" || v === "sim" || v === "nao") return { ok: true, estado: v };
  return { ok: false, erro: "estado_invalido" };
}

async function garantir(db: Banco) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_controlado (chave TEXT PRIMARY KEY, original TEXT NOT NULL, estado TEXT NOT NULL, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_alteracao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, titulo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
}

type Linha = { chave: string; original: string; estado: "sim" | "nao"; por: string; quando: string };

async function log(db: Banco, a: { chave: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string }, agora: Date) {
  await db
    .prepare("INSERT INTO produto_alteracao_log (tipo, chave, titulo, acao, anterior, novo, por, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind("controlado", a.chave, a.titulo, a.acao, a.anterior, a.novo, a.por, agora.toISOString())
    .run();
}

export async function definirControlado(db: Banco, original: string, estado: EstadoControlado, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave, original, estado, por, quando FROM produto_controlado WHERE chave = ?").bind(chave).first<Linha>();
  if (estado === "auto") {
    if (!antes) return;
    await db.prepare("DELETE FROM produto_controlado WHERE chave = ?").bind(chave).run();
    await log(db, { chave, titulo: original, acao: "voltou o controlado ao automático", anterior: antes.estado, novo: "auto", por }, agora);
    return;
  }
  await db
    .prepare("INSERT OR REPLACE INTO produto_controlado (chave, original, estado, por, quando) VALUES (?, ?, ?, ?, ?)")
    .bind(chave, original, estado, por, agora.toISOString())
    .run();
  await log(
    db,
    {
      chave,
      titulo: original,
      acao: estado === "sim" ? "marcou como controlado" : "marcou como não controlado",
      anterior: antes?.estado ?? "auto",
      novo: estado,
      por,
    },
    agora,
  );
}

export async function mapaDeControlados(db: Banco): Promise<Record<string, { estado: "sim" | "nao"; por: string; quando: string }>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, estado, por, quando FROM produto_controlado ORDER BY quando").bind().all<Linha>();
  const mapa: Record<string, { estado: "sim" | "nao"; por: string; quando: string }> = {};
  for (const l of results) {
    if (l.estado === "sim" || l.estado === "nao") mapa[l.chave] = { estado: l.estado, por: l.por, quando: l.quando };
  }
  return mapa;
}
