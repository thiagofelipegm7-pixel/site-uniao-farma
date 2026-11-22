/**
 * Fotos extras (coleção) de cada produto, guardadas no D1 por código de barras (EAN) até a sincronização
 * gravar os arquivos em public/produtos-extras/<EAN>/01.webp, 02.webp... e atualizar o índice da ficha.
 */
import { mimeDosBytes, MAX_BASE64, type Mime } from "./fotos-enviadas";

export const MAX_FOTOS_COLECAO = 6;

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    bind(...valores: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> };
  };
};

export type FotoColecao = { ordem: number; mime: Mime; criadoEm: string };

export async function criarTabelaColecoes(db: Banco): Promise<void> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS foto_colecao (ean TEXT NOT NULL, ordem INTEGER NOT NULL, mime TEXT NOT NULL, base64 TEXT NOT NULL, criado_em TEXT NOT NULL, PRIMARY KEY (ean, ordem))",
  );
}

export async function listarColecao(db: Banco, ean: string): Promise<FotoColecao[]> {
  await criarTabelaColecoes(db);
  const { results } = await db
    .prepare("SELECT ordem, mime, criado_em AS criadoEm FROM foto_colecao WHERE ean = ? ORDER BY ordem")
    .bind(ean)
    .all<FotoColecao>();
  return results;
}

/** Todas as fotos de todas as coleções (só EAN e ordem), para a sincronização recriar as pastas do site. */
export async function listarTodasColecoes(db: Banco): Promise<{ ean: string; ordem: number }[]> {
  await criarTabelaColecoes(db);
  const { results } = await db.prepare("SELECT ean, ordem FROM foto_colecao ORDER BY ean, ordem").bind().all<{ ean: string; ordem: number }>();
  return results;
}

export async function lerFotoColecao(db: Banco, ean: string, ordem: number): Promise<{ mime: Mime; base64: string } | null> {
  await criarTabelaColecoes(db);
  const linha = await db
    .prepare("SELECT mime, base64 FROM foto_colecao WHERE ean = ? AND ordem = ?")
    .bind(ean, ordem)
    .first<{ mime: Mime; base64: string }>();
  return linha ?? null;
}

/** Acrescenta uma foto no fim da coleção. Confere o formato pelos bytes e o limite de fotos. */
export async function adicionarFotoColecao(db: Banco, ean: string, base64: string, agora = new Date()): Promise<{ ok: true; ordem: number } | { ok: false; erro: string }> {
  if (!/^\d{8,14}$/.test(ean)) return { ok: false, erro: "ean_invalido" };
  if (typeof base64 !== "string" || base64.length === 0 || base64.length > MAX_BASE64) return { ok: false, erro: "imagem_muito_grande" };
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    return { ok: false, erro: "imagem_invalida" };
  }
  const mime = mimeDosBytes(bytes.subarray(0, 16));
  if (!mime) return { ok: false, erro: "formato_nao_aceito" };
  const atuais = await listarColecao(db, ean);
  if (atuais.length >= MAX_FOTOS_COLECAO) return { ok: false, erro: "limite_de_fotos" };
  const ordem = atuais.length ? Math.max(...atuais.map((f) => f.ordem)) + 1 : 1;
  await db
    .prepare("INSERT INTO foto_colecao (ean, ordem, mime, base64, criado_em) VALUES (?, ?, ?, ?, ?)")
    .bind(ean, ordem, mime, base64, agora.toISOString())
    .run();
  return { ok: true, ordem };
}

export async function removerFotoColecao(db: Banco, ean: string, ordem: number): Promise<void> {
  await db.prepare("DELETE FROM foto_colecao WHERE ean = ? AND ordem = ?").bind(ean, ordem).run();
  // Renumera para não ficar buraco na sequência.
  const restantes = await listarColecao(db, ean);
  for (let k = 0; k < restantes.length; k += 1) {
    if (restantes[k].ordem !== k + 1) await db.prepare("UPDATE foto_colecao SET ordem = ? WHERE ean = ? AND ordem = ?").bind(-(k + 1), ean, restantes[k].ordem).run();
  }
  for (let k = 0; k < restantes.length; k += 1) {
    await db.prepare("UPDATE foto_colecao SET ordem = ? WHERE ean = ? AND ordem = ?").bind(k + 1, ean, -(k + 1)).run();
  }
}

/** Troca a posição de uma foto com a vizinha (direção -1 sobe, 1 desce). */
export async function moverFotoColecao(db: Banco, ean: string, ordem: number, direcao: -1 | 1): Promise<void> {
  const alvo = ordem + direcao;
  if (alvo < 1) return;
  const existe = await db.prepare("SELECT 1 AS ok FROM foto_colecao WHERE ean = ? AND ordem = ?").bind(ean, alvo).first<{ ok: number }>();
  if (!existe) return;
  await db.prepare("UPDATE foto_colecao SET ordem = -1 WHERE ean = ? AND ordem = ?").bind(ean, ordem).run();
  await db.prepare("UPDATE foto_colecao SET ordem = ? WHERE ean = ? AND ordem = ?").bind(ordem, ean, alvo).run();
  await db.prepare("UPDATE foto_colecao SET ordem = ? WHERE ean = ? AND ordem = -1").bind(alvo, ean).run();
}
