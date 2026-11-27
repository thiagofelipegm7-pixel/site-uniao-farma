/**
 * Arte dos banners da home. O painel interno grava cada arte no banco como data URL (texto base64). Entregar isso dentro do JSON da lista
 * de banners pesava mais de 1 MB e atrasava o LCP da home, então a imagem passa a sair como arquivo binário em `/api/banner-imagem?v=<id da linha>`:
 * o `id` da linha muda a cada nova arte enviada, então o endereço de cada versão nunca muda de conteúdo e pode ficar um ano em cache.
 * Módulo sem Cloudflare (testável).
 */

/** Só formatos de imagem comuns. SVG fica de fora de propósito (pode carregar script). */
const TIPOS_PERMITIDOS = new Set(["image/webp", "image/jpeg", "image/png", "image/gif", "image/avif"]);

/** Endereço do arquivo da arte de uma linha de banner. */
export function urlDaImagemDoBanner(idDaLinha: number): string {
  return `/api/banner-imagem?v=${Math.floor(idDaLinha)}`;
}

/** `?v=123` → 123; qualquer outra coisa (texto, negativo, decimal, enorme) → null. */
export function idDaLinhaValido(v: string | null): number | null {
  if (!v || !/^\d{1,12}$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** `data:image/webp;base64,...` → tipo e bytes. Devolve null se não for uma imagem permitida em base64 válido. */
export function lerImagemDeDataUrl(src: string | null | undefined): { tipo: string; bytes: Uint8Array } | null {
  if (typeof src !== "string") return null;
  const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(src);
  if (!m) return null;
  const tipo = m[1].toLowerCase();
  if (!TIPOS_PERMITIDOS.has(tipo)) return null;
  try {
    const binario = atob(m[2].replace(/\s+/g, ""));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes.length > 0 ? { tipo, bytes } : null;
  } catch {
    return null;
  }
}
