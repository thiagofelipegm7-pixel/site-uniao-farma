/**
 * Fotos enviadas pelo painel interno (/interno/fotos). Ficam guardadas no D1 até a sincronização automática
 * (GitHub Actions) baixar, converter, colocar em public/produtos/<EAN>.webp e publicar o site. Depois ela apaga daqui.
 */
type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    bind(...valores: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> };
  };
};

export const MAX_BASE64 = 600_000; // ~450 KB de imagem
export type Mime = "image/webp" | "image/png" | "image/jpeg";

/** Descobre o formato pelos primeiros bytes (não confia no que o navegador disse). */
export function mimeDosBytes(b: Uint8Array): Mime | null {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

export type Envio = { ean: string; nome: string; mime: Mime; base64: string };

/** Confere o que o painel mandou: { ean, nome, imagem (base64) }. */
export function validarEnvio(corpo: unknown): { ok: true; envio: Envio } | { ok: false; erro: string } {
  const c = (corpo ?? {}) as Record<string, unknown>;
  const ean = typeof c.ean === "string" ? c.ean.trim() : "";
  const nome = typeof c.nome === "string" ? c.nome.replace(/\s+/g, " ").trim() : "";
  const imagem = typeof c.imagem === "string" ? c.imagem.replace(/^data:[^,]*,/, "") : "";
  if (!/^\d{8,14}$/.test(ean)) return { ok: false, erro: "codigo_invalido" };
  if (!nome || nome.length > 200) return { ok: false, erro: "nome_invalido" };
  if (!imagem || imagem.length > MAX_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imagem)) return { ok: false, erro: "imagem_invalida" };
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(imagem), (ch) => ch.charCodeAt(0));
  } catch {
    return { ok: false, erro: "imagem_invalida" };
  }
  const mime = mimeDosBytes(bytes);
  if (!mime || bytes.length < 500) return { ok: false, erro: "formato_invalido" };
  return { ok: true, envio: { ean, nome, mime, base64: imagem } };
}

async function garantirTabela(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS foto_enviada (ean TEXT PRIMARY KEY, nome TEXT NOT NULL, mime TEXT NOT NULL, dados TEXT NOT NULL, criado TEXT NOT NULL)");
  // Tabela criada antes de existir a coluna "slug" (página do produto): acrescenta uma vez; erro de coluna repetida é esperado.
  try {
    await db.exec("ALTER TABLE foto_enviada ADD COLUMN slug TEXT");
  } catch {
    // já existe
  }
}

export async function guardarFoto(db: Banco, envio: Envio, slug: string | null, agora = new Date()): Promise<void> {
  await garantirTabela(db);
  await db.prepare("INSERT OR REPLACE INTO foto_enviada (ean, nome, mime, dados, criado, slug) VALUES (?, ?, ?, ?, ?, ?)").bind(envio.ean, envio.nome, envio.mime, envio.base64, agora.toISOString(), slug).run();
}

export async function listarPendentes(db: Banco): Promise<{ ean: string; nome: string; mime: string }[]> {
  await garantirTabela(db);
  const { results } = await db.prepare("SELECT ean, nome, mime FROM foto_enviada ORDER BY criado").bind().all<{ ean: string; nome: string; mime: string }>();
  return results;
}

export async function lerFoto(db: Banco, ean: string): Promise<{ mime: string; base64: string } | null> {
  await garantirTabela(db);
  return db.prepare("SELECT mime, dados AS base64 FROM foto_enviada WHERE ean = ?").bind(ean).first<{ mime: string; base64: string }>();
}

export async function apagarFoto(db: Banco, ean: string): Promise<void> {
  await garantirTabela(db);
  await db.prepare("DELETE FROM foto_enviada WHERE ean = ?").bind(ean).run();
}

/** Endereços que o painel pode mandar o servidor baixar: https, com nome de site (nunca IP, localhost ou rede interna), sem usuário/senha. */
export function urlPermitida(texto: string): URL | null {
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[") || /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(h)) return null;
  return u;
}

/** Fotos que já valem no site antes da publicação: página do produto -> código. A foto em si sai de /api/foto-nova?ean=. */
export async function listarNovas(db: Banco): Promise<Record<string, string>> {
  await garantirTabela(db);
  const { results } = await db.prepare("SELECT ean, slug FROM foto_enviada WHERE slug IS NOT NULL ORDER BY criado").bind().all<{ ean: string; slug: string }>();
  const mapa: Record<string, string> = {};
  for (const l of results) mapa[l.slug] = l.ean;
  return mapa;
}
