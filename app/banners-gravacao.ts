// Gravação dos banners da home no D1 (tabela metric_hits, stage = "banner"; intent = vaga, source = arte em data URL).
//
// Limite: no D1 cada linha (e cada texto) pode ter no máximo 2.000.000 bytes. A arte vai como data URL em base64,
// que ocupa 4/3 do arquivo. Deixando folga para as outras colunas, a data URL pode ter até 1.900.000 caracteres,
// o que dá um arquivo de imagem de até ~1,4 MB. No painel mostramos "1,3 MB" para ficar com margem.

/** Tamanho máximo da data URL gravada (caracteres = bytes, é tudo ASCII). */
export const MAX_DATA_URL = 1_900_000;
/** Tamanho máximo do arquivo de imagem aceito no painel (bytes): ~1,3 MB, já contando o aumento do base64. */
export const MAX_ARQUIVO_BYTES = 1_300_000;
export const MAX_ARQUIVO_TEXTO = "1,3 MB";

export type ErroBanner = "faltando" | "vaga_invalida" | "formato_invalido" | "arte_grande";

export function mensagemTamanho(bytes: number) {
  const mb = (bytes / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `A arte tem ${mb} MB e o máximo é ${MAX_ARQUIVO_TEXTO}. Diminua a imagem (por exemplo, salve como JPG com largura de até 1920 px) e envie de novo. O banner atual não foi alterado.`;
}

export function validarBanner(body: unknown): { ok: true; id: string; url: string } | { ok: false; erro: ErroBanner; status: number } {
  const b = (body ?? {}) as { id?: unknown; url?: unknown };
  if (typeof b.id !== "string" || typeof b.url !== "string" || !b.id || !b.url) return { ok: false, erro: "faltando", status: 400 };
  if (!/^[a-z0-9-]{1,40}$/.test(b.id)) return { ok: false, erro: "vaga_invalida", status: 400 };
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(b.url) && !/^https:\/\//i.test(b.url)) return { ok: false, erro: "formato_invalido", status: 400 };
  if (b.url.length > MAX_DATA_URL) return { ok: false, erro: "arte_grande", status: 413 };
  return { ok: true, id: b.id, url: b.url };
}

type Stmt = { bind: (...v: unknown[]) => Stmt; run: () => Promise<unknown> };
export type BancoBanner = { prepare: (sql: string) => Stmt; batch?: (stmts: Stmt[]) => Promise<unknown> };

/**
 * Grava a arte nova e só depois apaga a(s) antiga(s) da mesma vaga.
 * No D1, `batch` roda tudo numa transação: se o INSERT falhar, nada muda e a arte antiga continua no ar.
 * Mesmo sem transação, a ordem (insere, depois apaga as mais velhas que a nova) nunca deixa a vaga vazia.
 */
export async function gravarBanner(db: BancoBanner, id: string, url: string, agora = new Date()) {
  const inserir = db
    .prepare("INSERT INTO metric_hits (day, stage, intent, source, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(agora.toISOString().slice(0, 10), "banner", id, url, agora.toISOString());
  const apagarAntigas = db
    .prepare("DELETE FROM metric_hits WHERE stage = ? AND intent = ? AND id < (SELECT MAX(id) FROM metric_hits WHERE stage = ? AND intent = ?)")
    .bind("banner", id, "banner", id);
  if (typeof db.batch === "function") {
    await db.batch([inserir, apagarAntigas]);
    return;
  }
  await inserir.run();
  await apagarAntigas.run();
}
